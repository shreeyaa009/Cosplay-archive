const API_URL = 'http://localhost:5001/api';


/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

document.querySelectorAll('.password-toggle').forEach(button => {

    button.addEventListener('click', () => {

        const input = document.getElementById(
            button.dataset.target
        );

        if (!input) return;

        if (input.type === 'password') {

            input.type = 'text';

            button.textContent = '♥';

            button.setAttribute(
                'aria-label',
                'Hide password'
            );

        } else {

            input.type = 'password';

            button.textContent = '♡';

            button.setAttribute(
                'aria-label',
                'Show password'
            );
        }
    });

});


/* =========================================================
   MESSAGE HELPERS
   ========================================================= */

function showMessage(element, message, type) {

    if (!element) return;

    element.textContent = message;

    element.className = `auth-message ${type}`;
}


function clearMessage(element) {

    if (!element) return;

    element.textContent = '';

    element.className = 'auth-message';
}


/* =========================================================
   LOGIN
   ========================================================= */

const loginForm = document.getElementById('loginForm');

if (loginForm) {

    loginForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        const identifier =
            document.getElementById('loginIdentifier')
                .value
                .trim();

        const password =
            document.getElementById('loginPassword')
                .value;

        const button =
            document.getElementById('loginButton');

        const message =
            document.getElementById('loginMessage');

        const identifierError =
            document.getElementById('identifierError');

        const passwordError =
            document.getElementById('passwordError');


        identifierError.textContent = '';
        passwordError.textContent = '';

        clearMessage(message);


        if (!identifier) {

            identifierError.textContent =
                'Please enter your username or email.';

            return;
        }


        if (!password) {

            passwordError.textContent =
                'Please enter your password.';

            return;
        }


        button.disabled = true;

        button.innerHTML =
            '<span>✨</span><span>Logging in...</span><span>♡</span>';


        try {

            const response = await fetch(
                `${API_URL}/auth/login`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        identifier,
                        password
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                showMessage(
                    message,
                    data.error ||
                    'Login failed. Please try again.',
                    'error'
                );

                return;
            }


            /*
             * Save authentication information.
             * The main website can use this token later
             * when we connect character data to users.
             */

            localStorage.setItem(
                'cosplayAuthToken',
                data.token
            );

            localStorage.setItem(
                'cosplayUser',
                JSON.stringify(data.user)
            );


            showMessage(
                message,
                '♡ Login successful! Welcome back! ✨',
                'success'
            );


            button.innerHTML =
                '<span>🌸</span><span>Welcome!</span><span>♡</span>';


            setTimeout(() => {

                window.location.href = 'index.html';

            }, 700);


        } catch (error) {

            console.error('Login error:', error);

            showMessage(
                message,
                'Unable to connect to the server. Please make sure the backend is running.',
                'error'
            );

        } finally {

            button.disabled = false;

            if (!localStorage.getItem('cosplayAuthToken')) {

                button.innerHTML =
                    '<span>🎀</span><span>Log In</span><span>♡</span>';
            }
        }

    });

}


/* =========================================================
   SIGNUP
   ========================================================= */

const signupForm = document.getElementById('signupForm');

if (signupForm) {

    const passwordInput =
        document.getElementById('signupPassword');


    /* Password rule checker */

    passwordInput.addEventListener('input', () => {

        const password = passwordInput.value;


        const rules = {

            ruleLength:
                password.length >= 8,

            ruleUpper:
                /[A-Z]/.test(password),

            ruleLower:
                /[a-z]/.test(password),

            ruleNumber:
                /[0-9]/.test(password)

        };


        Object.entries(rules).forEach(
            ([id, valid]) => {

                const element =
                    document.getElementById(id);

                if (!element) return;

                element.classList.toggle(
                    'valid',
                    valid
                );

                element.textContent =
                    valid
                        ? element.textContent.replace('♡', '✓')
                        : element.textContent.replace('✓', '♡');
            }
        );

    });


    signupForm.addEventListener(
        'submit',
        async (event) => {

            event.preventDefault();


            const username =
                document.getElementById('signupUsername')
                    .value
                    .trim();

            const email =
                document.getElementById('signupEmail')
                    .value
                    .trim();

            const password =
                document.getElementById('signupPassword')
                    .value;


            const usernameError =
                document.getElementById(
                    'signupUsernameError'
                );

            const emailError =
                document.getElementById(
                    'signupEmailError'
                );

            const passwordError =
                document.getElementById(
                    'signupPasswordError'
                );

            const message =
                document.getElementById(
                    'signupMessage'
                );

            const button =
                document.getElementById(
                    'signupButton'
                );


            usernameError.textContent = '';
            emailError.textContent = '';
            passwordError.textContent = '';

            clearMessage(message);


            /* Username validation */

            if (username.length < 3) {

                usernameError.textContent =
                    'Username must be at least 3 characters.';

                return;
            }


            if (username.length > 50) {

                usernameError.textContent =
                    'Username cannot be longer than 50 characters.';

                return;
            }


            /* Email validation */

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {

                emailError.textContent =
                    'Please enter a valid email address.';

                return;
            }


            /* Password validation */

            if (password.length < 8) {

                passwordError.textContent =
                    'Password must be at least 8 characters.';

                return;
            }


            if (!/[A-Z]/.test(password)) {

                passwordError.textContent =
                    'Password needs at least one uppercase letter.';

                return;
            }


            if (!/[a-z]/.test(password)) {

                passwordError.textContent =
                    'Password needs at least one lowercase letter.';

                return;
            }


            if (!/[0-9]/.test(password)) {

                passwordError.textContent =
                    'Password needs at least one number.';

                return;
            }


            button.disabled = true;

            button.innerHTML =
                '<span>✨</span><span>Creating your archive...</span><span>♡</span>';


            try {

                const response = await fetch(
                    `${API_URL}/auth/register`,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            username,
                            email,
                            password
                        })
                    }
                );


                const data =
                    await response.json();


                if (!response.ok) {

                    showMessage(
                        message,
                        data.error ||
                        'Could not create your account.',
                        'error'
                    );

                    return;
                }


                showMessage(
                    message,
                    '🎀 Account created successfully! Taking you to login...',
                    'success'
                );


                button.innerHTML =
                    '<span>🌸</span><span>Account Created!</span><span>♡</span>';


                setTimeout(() => {

                    window.location.href = 'login.html';

                }, 1000);


            } catch (error) {

                console.error(
                    'Signup error:',
                    error
                );

                showMessage(
                    message,
                    'Unable to connect to the server. Please make sure the backend is running.',
                    'error'
                );

            } finally {

                if (
                    !localStorage.getItem(
                        'cosplayAuthToken'
                    )
                ) {

                    button.disabled = false;

                    button.innerHTML =
                        '<span>🎀</span><span>Create My Archive</span><span>♡</span>';
                }

            }

        }
    );

}