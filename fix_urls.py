import os

path = 'client/src/context/UserContext.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("'http://localhost:3001/api", "`${API_URL}/api")
content = content.replace("`/api`", "`/api`") # dummy
content = content.replace("`${API_URL}/api/login'", "`${API_URL}/api/login`")
content = content.replace("`${API_URL}/api/verify-otp'", "`${API_URL}/api/verify-otp`")
content = content.replace("`${API_URL}/api/update-theme'", "`${API_URL}/api/update-theme`")
content = content.replace("`${API_URL}/api/update-plan'", "`${API_URL}/api/update-plan`")
content = content.replace("`${API_URL}/api/init-upgrade'", "`${API_URL}/api/init-upgrade`")
content = content.replace("`${API_URL}/api/confirm-upgrade'", "`${API_URL}/api/confirm-upgrade`")
content = content.replace("`${API_URL}/api/channel/update'", "`${API_URL}/api/channel/update`")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
