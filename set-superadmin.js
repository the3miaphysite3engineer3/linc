const DATABASE_URL = "https://churchmeeting-default-rtdb.firebaseio.com";
const ADMIN_KEY = "georgtawadrous@gmail,com";

fetch(`${DATABASE_URL}/admins/${ADMIN_KEY}.json`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify("superadmin"),
})
  .then(res => res.json())
  .then(data => console.log("Done:", data))
  .catch(err => console.error("Error:", err));
