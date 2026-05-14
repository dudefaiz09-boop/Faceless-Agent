#!/bin/bash

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
LOCAL_URL="${LOCAL_URL:-http://localhost:3000}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Set SUPABASE_URL and SUPABASE_ANON_KEY before running smoke tests."
  exit 1
fi

echo "Starting EduConnect smoke tests against ${LOCAL_URL}"
echo "-----------------------------------"

get_token() {
  local email=$1
  local password=$2
  curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" | jq -r '.access_token'
}

test_endpoint() {
  local name=$1
  local token=$2
  local method=$3
  local path=$4
  local data=${5:-}

  echo -n "Testing $name ($path)... "
  local response
  response=$(curl -s -X "$method" "${LOCAL_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$data")
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${LOCAL_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$data")

  echo "Status: $code"
  if [ "$code" == "200" ] || [ "$code" == "201" ]; then
    return 0
  fi

  echo "Response: $response"
  return 1
}

echo "Setting up test announcements..."
TEACHER_TOKEN=$(get_token "teacher.a@educonnect.test" "Teach@1234")

test_endpoint "Post Global Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"School Fair","content":"Everyone is invited","targetClasses":["all"]}'
test_endpoint "Post 10A Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"10A Math Quiz","content":"Tomorrow at 8am","targetClasses":["10A"]}'
test_endpoint "Post 10B Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"10B Field Trip","content":"Bring your lunch","targetClasses":["10B"]}'

echo ""
echo "Testing Student A (10A) visibility..."
STUDENT_A_TOKEN=$(get_token "student.a@educonnect.test" "Test@1234")
curl -s -X GET "${LOCAL_URL}/api/announcements" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.[] | {title, targetClasses}'

echo ""
echo "Testing Student B (10B) visibility..."
STUDENT_B_TOKEN=$(get_token "student.b@educonnect.test" "Test@1234")
curl -s -X GET "${LOCAL_URL}/api/announcements" -H "Authorization: Bearer ${STUDENT_B_TOKEN}" | jq -c '.[] | {title, targetClasses}'

echo "Testing attendance marking..."
test_endpoint "Mark Attendance for 10A" "$TEACHER_TOKEN" "POST" "/api/attendance/mark" '{"classId":"10A","date":"2026-05-02","records":[{"studentId":"student-a-id","status":"present"}]}'

echo "-----------------------------------"
echo "Smoke tests completed."
