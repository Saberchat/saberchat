//toggles the classes for animating the login and register forms
$(function() {
    //login form
    $(".user-form-btn.login").on('click', function(){
        $(".user-form.login").addClass("display");
        $(".user-form.signup").removeClass("display");
    });
    $(".form-close.login").on('click', function(){
        $(".user-form.login").removeClass("display");
    });

    //register form
    $(".user-form-btn.signup").on('click', function(){
        $(".user-form.signup").addClass("display");
        $(".user-form.login").removeClass("display");
    });
    $(".form-close.signup").on('click', function(){
        $(".user-form.signup").removeClass("display");
    });
});

// class animations for the signup form
function next() {
    $('.user-info').removeClass('display');
    $('.login-info').addClass('display');
}

function back() {
    $('.user-info').addClass('display');
    $('.login-info').removeClass('display');
}

// prevents double clicking the form submit
function disableBtn() {
    document.getElementById('register-button').disabled = true;
}

// reactivates button on invalid form submit
function enableBtn() {
    document.getElementById('register-button').disabled = false;
}

// validates signup form
function validateForm() {
    let form = document.forms.signup;
    if(form.firstName.value == '') {
        enableBtn();
        back();
        form.firstName.style.border = '2px solid red';
        form.firstName.placeholder = 'Enter first name!';
        return false;
    } else if(form.lastName.value == '') {
        enableBtn();
        back();
        form.lastName.style.border = '2px solid red';
        form.lastName.placeholder = 'Enter last name!';
        return false;
    } else if(form.username.value == '') {
        enableBtn();
        back();
        form.username.style.border = '2px solid red';
        form.username.placeholder = 'Enter username!';
        return false;
    } else if(form.email.value == '') {
        enableBtn();
        form.email.style.border = '2px solid red';
        form.email.placeholder = 'Enter email!';
        return false;
    } else if(form.password.value == '') {
        enableBtn();
        form.email.style.border = '2px solid red';
        form.email.placeholder = 'Enter password';
        return false;
    }
    if(!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(form.email.value)) {
        enableBtn();
        form.email.style.border = '2px solid red';
        return false;
    }

}

function submitActions() {
    disableBtn();
    return validateForm();
}