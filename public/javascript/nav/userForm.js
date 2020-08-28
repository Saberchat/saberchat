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