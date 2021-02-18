//toggles the classes for animating the login and register forms
$(() => {
    //login form
    $(".user-form-btn.login").on('click', () => {
        $(".user-form.login").addClass("display");
        $(".user-form.signup").removeClass("display");
    });
    $(".form-close.login").on('click', () => {
        $(".user-form.login").removeClass("display");
    });

    //register form
    $(".user-form-btn.signup").on('click', () => {
        $(".user-form.signup").addClass("display");
        $(".user-form.login").removeClass("display");
    });
    $(".form-close.signup").on('click', () => {
        $(".user-form.signup").removeClass("display");
    });
});

// class animations for the signup form
const next = function () {
    $('.user-info').removeClass('display');
    $('.login-info').addClass('display');
}

const back = function () {
    $('.user-info').addClass('display');
    $('.login-info').removeClass('display');
}

const disableBtn = function () { // prevents double clicking the form submit
    document.getElementById('register-button').disabled = true;
}

const enableBtn = function () { // reactivates button on invalid form submit
    document.getElementById('register-button').disabled = false;
}

const validateForm = function () { // validates signup form
    let form = document.forms.signup;
    if (form.firstName.value == '') {
        enableBtn();
        back();
        form.firstName.style.border = '2px solid red';
        form.firstName.placeholder = 'Enter first name!';
        return false;
    } else if (form.lastName.value == '') {
        enableBtn();
        back();
        form.lastName.style.border = '2px solid red';
        form.lastName.placeholder = 'Enter last name!';
        return false;
    } else if (form.username.value == '') {
        enableBtn();
        back();
        form.username.style.border = '2px solid red';
        form.username.placeholder = 'Enter username!';
        return false;
    } else if (form.email.value == '') {
        enableBtn();
        form.email.style.border = '2px solid red';
        form.email.placeholder = 'Enter email!';
        return false;
    } else if (form.password.value == '') {
        enableBtn();
        form.password.style.border = '2px solid red';
        form.password.placeholder = 'Enter password';
        return false;
    } else if (form.password.value.length <= 8) {
        enableBtn();
        form.password.style.border = '2px solid red';
        return false;
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(form.email.value)) {
        enableBtn();
        form.email.style.border = '2px solid red';
        return false;
    }
}

const submitActions = function () {
    disableBtn();
    return validateForm();
}
