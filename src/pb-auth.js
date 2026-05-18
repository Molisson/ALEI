export function isAuthFail() {
    return document.body.children.length < 5 && document.body.textContent.includes("You are not logged in");
}

export function notLoggedIn() {
    removeFailedPasswordCookie();
    addLoginForm();
}

// clears failed password cookie for security reasons 
function removeFailedPasswordCookie() {
    if (!isAuthFail()) return;
    document.cookie = "password=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

function doLogin(login, password) {
    document.cookie = `login=${login}; Path=/;`;
    document.cookie = `password=${password}; Path=/;`;
    window.location.reload();
}

function addLoginForm() {
    let html = "";
    html += "<br><br>";
    html += "<p>You can login using this form (added by ALEI)</p>";
    html += "<p>Use the MD5 value generated from your site password. You can generate the MD5 using an online tool. Don't use your plaintext password, it's not secure to do that and will not work. Keep the MD5 of your password secret because it can be used to steal your account.</p>";
    html += `
<form>
    <div>
        <label>Login: <input type="text" name="login" id="login-field" required /></label>
    </div>
    <div>
        <label>MD5 of your password: <input type="password" name="password" id="password-field" required /></label>
    </div>
    <div>
        <button type="button" id="login-button">Log in</button>
    </div>
</form>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("login-button").addEventListener("click", () => {
        const login = document.getElementById("login-field").value;
        const password = document.getElementById("password-field").value;
        doLogin(login, password);
    });
}