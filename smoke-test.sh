#!/bin/bash

# Configuration
API_KEY="${FIREBASE_API_KEY:-YOUR_FIREBASE_API_KEY_HERE}"
LOCAL_URL="http://localhost:3000"

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

# 4. Attendance Tests
echo "📝 Testing Attendance Marking..."
test_endpoint "Mark Attendance for 10A" "$TEACHER_TOKEN" "POST" "/api/attendance/mark" '{"classId":"10A","date":"2026-05-02","records":[{"studentId":"GmUxe7Jf19c0hFlNVuqoCbfiFj63","status":"present"}]}'

echo "🧑‍🎓 Testing Student A Attendance History..."
STUDENT_A_UID="GmUxe7Jf19c0hFlNVuqoCbfiFj63" # From Firestore search
echo "History for Student A:"
curl -s -X GET "${LOCAL_URL}/api/attendance/history/${STUDENT_A_UID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.[] | {date, status}'

# 5. Assignment Tests
echo "📝 Testing Assignment Creation..."
CREATE_RESP=$(curl -s -X POST "${LOCAL_URL}/api/assignments/create" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Math Quiz","description":"Algebra 101","dueDate":"2026-06-01","classId":"10A"}')
ASSIGNMENT_ID=$(echo $CREATE_RESP | jq -r '.id')
echo "Created Assignment ID: $ASSIGNMENT_ID"

echo "🧑‍🎓 Testing Assignment Submission..."
test_endpoint "Submit Assignment" "$STUDENT_A_TOKEN" "POST" "/api/assignments/submit" "{\"assignmentId\":\"$ASSIGNMENT_ID\",\"content\":\"The answer is X=5\"}"

echo "🧑‍🏫 Testing Assignment Grading..."
test_endpoint "Grade Submission" "$TEACHER_TOKEN" "POST" "/api/assignments/grade" "{\"assignmentId\":\"$ASSIGNMENT_ID\",\"studentId\":\"$STUDENT_A_UID\",\"grade\":\"A+\",\"feedback\":\"Great work!\"}"

# 6. Chat Tests
echo "📝 Testing Chat Messaging..."
CHAT_RESP=$(curl -s -X POST "${LOCAL_URL}/api/chat/send" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"recipientId\":\"$STUDENT_A_UID\",\"text\":\"Hello Student A!\",\"type\":\"direct\"}")
CONV_ID=$(echo $CHAT_RESP | jq -r '.conversationId')
echo "Conversation ID: $CONV_ID"

echo "🧑‍🎓 Testing Student A Message Retrieval..."
echo "Messages for Student A:"
curl -s -X GET "${LOCAL_URL}/api/chat/messages/${CONV_ID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.[] | {senderName, text}'

# 7. Library Tests
echo "📝 Testing Library Upload..."
PRINCIPAL_TOKEN=$(get_token "principal@educonnect.test" "Principal@1234")
LIB_RESP=$(curl -s -X POST "${LOCAL_URL}/api/library/upload" \
  -H "Authorization: Bearer ${PRINCIPAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Physics 101","subject":"Science","grade":"10","fileUrl":"https://example.com/physics.pdf","tags":["physics","intro"]}')
RESOURCE_ID=$(echo $LIB_RESP | jq -r '.id')
echo "Uploaded Resource ID: $RESOURCE_ID"

echo "🧑‍🎓 Testing Book Borrowing..."
test_endpoint "Borrow Book" "$STUDENT_A_TOKEN" "POST" "/api/library/borrow" "{\"resourceId\":\"$RESOURCE_ID\"}"

echo "🧑‍🎓 Testing Student A Borrow History..."
echo "History for Student A:"
curl -s -X GET "${LOCAL_URL}/api/library/borrow/history/${STUDENT_A_UID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.[] | {resourceId, status}'

# 8. Fees Tests
echo "📝 Testing Fee Record Upload..."
FEE_RESP=$(curl -s -X POST "${LOCAL_URL}/api/fees/upload" \
  -H "Authorization: Bearer ${PRINCIPAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[{\"studentId\":\"$STUDENT_A_UID\",\"amountDue\":1000,\"dueDate\":\"2026-06-30\",\"classId\":\"10A\"}]}")
echo "Upload Response: $FEE_RESP"

echo "🧑‍🎓 Testing Fee Retrieval and Payment..."
STUDENT_DATA=$(curl -s -X GET "${LOCAL_URL}/api/fees/${STUDENT_A_UID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}")
FEE_ID=$(echo $STUDENT_DATA | jq -r '.fees[0].id')
echo "Fee ID for payment: $FEE_ID"

test_endpoint "Pay Fee" "$STUDENT_A_TOKEN" "POST" "/api/fees/pay" "{\"feeId\":\"$FEE_ID\",\"amount\":1000,\"method\":\"online\"}"

echo "🧑‍🎓 Testing Student A Payment History..."
curl -s -X GET "${LOCAL_URL}/api/fees/${STUDENT_A_UID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}" | jq -c '.payments[] | {amount, status}'

# 9. Performance Tests
echo "📝 Testing Performance Record Upload..."
PERF_RESP=$(curl -s -X POST "${LOCAL_URL}/api/performance/upload" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[{\"studentId\":\"$STUDENT_A_UID\",\"subject\":\"Mathematics\",\"term\":\"Term 1\",\"score\":88,\"grade\":\"A\",\"classId\":\"10A\"}]}")
echo "Upload Response: $PERF_RESP"

echo "🧑‍🎓 Testing Performance Retrieval and AI Suggestions..."
STUDENT_PERF=$(curl -s -X GET "${LOCAL_URL}/api/performance/${STUDENT_A_UID}" -H "Authorization: Bearer ${STUDENT_A_TOKEN}")
echo "Performance Records: $STUDENT_PERF"

AI_TIPS=$(curl -s -X POST "${LOCAL_URL}/api/performance/ai-suggestions" \
  -H "Authorization: Bearer ${STUDENT_A_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"$STUDENT_A_UID\",\"records\":$STUDENT_PERF}")
echo "AI Study Tips: $AI_TIPS"

# 10. Student Management Tests
echo "📝 Testing Student Management APIs..."
NEW_STUDENT_EMAIL="new.student.$(date +%s)@educonnect.test"
CREATE_STUDENT_RESP=$(curl -s -X POST "${LOCAL_URL}/api/students/create" \
  -H "Authorization: Bearer ${TEACHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_STUDENT_EMAIL\",\"password\":\"TestPass123!\",\"displayName\":\"New Student\",\"classId\":\"10A\",\"section\":\"A\"}")
NEW_UID=$(echo $CREATE_STUDENT_RESP | jq -r '.uid')
echo "Created Student UID: $NEW_UID"

test_endpoint "Update Student Record" "$TEACHER_TOKEN" "PUT" "/api/students/$NEW_UID" '{"displayName":"Updated Student Name","classId":"10B"}'

test_endpoint "Bulk Student Import" "$TEACHER_TOKEN" "POST" "/api/students/bulk-import" '{"students":[{"email":"bulk1@educonnect.test","displayName":"Bulk Student 1","classId":"9A"},{"email":"bulk2@educonnect.test","displayName":"Bulk Student 2","classId":"9B"}]}'

# 11. Teacher Management Tests
echo "📝 Testing Teacher Management APIs..."
NEW_TEACHER_EMAIL="new.teacher.$(date +%s)@educonnect.test"
CREATE_TEACHER_RESP=$(curl -s -X POST "${LOCAL_URL}/api/teachers/create" \
  -H "Authorization: Bearer ${PRINCIPAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$NEW_TEACHER_EMAIL\",\"password\":\"StaffPass123!\",\"displayName\":\"New Teacher\",\"subjects\":[\"History\"],\"classes\":[\"10A\"]}")
NEW_T_UID=$(echo $CREATE_TEACHER_RESP | jq -r '.uid')
echo "Created Teacher UID: $NEW_T_UID"

test_endpoint "Update Teacher Record" "$PRINCIPAL_TOKEN" "PUT" "/api/teachers/$NEW_T_UID" '{"displayName":"Updated Teacher Name","subjects":["History", "Civics"]}'

test_endpoint "Bulk Teacher Import" "$PRINCIPAL_TOKEN" "POST" "/api/teachers/bulk-import" '{"teachers":[{"email":"tbulk1@educonnect.test","displayName":"Bulk Teacher 1","subjects":["Art"]},{"email":"tbulk2@educonnect.test","displayName":"Bulk Teacher 2","subjects":["Music"]}]}'

echo "-----------------------------------"
echo "✅ Smoke tests completed."
