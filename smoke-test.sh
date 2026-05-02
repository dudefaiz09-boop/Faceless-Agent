#!/bin/bash

# Configuration
API_KEY="AIzaSyAMBaqtdxkZ1MUKwLrA7k_JzDA4eLwPpxQ"
LOCAL_URL="http://localhost:8080"

echo "🔍 Starting EduConnect Smoke Tests..."
echo "-----------------------------------"

get_token() {
  local email=$1
  local password=$2
  curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"returnSecureToken\":true}" | jq -r '.idToken'
}

test_endpoint() {
  local name=$1
  local token=$2
  local method=$3
  local path=$4
  local data=$5
  
  echo -n "Testing $name ($path)... "
  local response=$(curl -s -X "$method" "${LOCAL_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$data")
  local code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${LOCAL_URL}${path}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  echo "Status: $code"
  if [ "$code" == "200" ] || [ "$code" == "201" ]; then
    return 0
  else
    echo "Response: $response"
    return 1
  fi
}

# 1. Setup Announcements
echo "📝 Setting up test announcements..."
TEACHER_TOKEN=$(get_token "teacher.a@educonnect.test" "Teach@1234")

test_endpoint "Post Global Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"School Fair","content":"Everyone is invited","targetClasses":["all"]}'
test_endpoint "Post 10A Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"10A Math Quiz","content":"Tomorrow at 8am","targetClasses":["10A"]}'
test_endpoint "Post 10B Announcement" "$TEACHER_TOKEN" "POST" "/api/announcements" '{"title":"10B Field Trip","content":"Bring your lunch","targetClasses":["10B"]}'

echo ""

# 2. Student A (10A) Tests
echo "🧑‍🎓 Testing Student A (10A) Visibility..."
STUDENT_A_TOKEN=$(get_token "student.a@educonnect.test" "Test@1234")
echo "Announcements for Student A:"
curl -s -X GET "${LOCAL_URL}/api/announcements" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.[] | {title, targetClasses}'

echo ""

# 3. Student B (10B) Tests
echo "🧑‍🎓 Testing Student B (10B) Visibility..."
STUDENT_B_TOKEN=$(get_token "student.b@educonnect.test" "Test@1234")
echo "Announcements for Student B:"
curl -s -X GET "${LOCAL_URL}/api/announcements" -H "Authorization: Bearer ${STUDENT_B_TOKEN}" | jq -c '.[] | {title, targetClasses}'

echo "-----------------------------------"
echo "✅ Smoke tests completed."
