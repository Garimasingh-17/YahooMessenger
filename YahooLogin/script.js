
const apiUrl = "http://localhost:5000/api/auth";

async function registerUser() {
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;
  const errorEl = document.getElementById("registerError");

  try {
    const res = await fetch(`${apiUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Registered successfully! Please log in.");
      showLogin();
    } else {
      errorEl.textContent = data.message;
    }
  } catch (err) {
    errorEl.textContent = "Something went wrong.";
  }
}

async function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const errorEl = document.getElementById("loginError");

  try {
    console.log("Sending login:", { username, password });
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Login successful!");
      localStorage.setItem("username", data.user); // Store username
window.location.href = "/messenger/main.html";
    } else {
      errorEl.textContent = data.error || "Login failed.";
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Something went wrong.";
  }
}


function showRegister() {
  document.getElementById("loginCard").style.display = "none";
  document.getElementById("registerCard").style.display = "block";
}

function showLogin() {
  document.getElementById("registerCard").style.display = "none";
  document.getElementById("loginCard").style.display = "block";
}
