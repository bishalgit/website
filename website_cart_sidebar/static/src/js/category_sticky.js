//Scroll to top
$(window).scroll(function () {
    var scroll = $(window).scrollTop();
//        console.log('Scroll Test');
    if (scroll >= 400) {
//            console.log('Class Added');
        $(".oe_category_menu").addClass("section-sticky");
    } else {
//            console.log('Class Removed');
        $(".oe_category_menu").removeClass("section-sticky");
    }

    if ($(this).scrollTop() != 0) {
        $(".scrollToTop").fadeIn();
    } else {
        $(".scrollToTop").fadeOut();
    }

    $(".scrollToTop").click(function () {
        $("body,html").animate({
            scrollTop: 0
        }, 800);
    });
});