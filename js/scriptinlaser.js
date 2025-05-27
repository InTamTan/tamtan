function openNav() {
    document.getElementById("mySidenav").style.width = "250px";
    document.getElementById("main").style.marginLeft = "20px";
    document.getElementById("main").style.marginLeft = "20px";
    document.getElementById("overlay").style.width = "100%";
    document.getElementById("overlay").style.height = "100%";
    document.getElementById("overlay").style.backgroundColor = "rgba(0,0,0,0.4)";            
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("main").style.marginLeft= "0";
    document.getElementById("overlay").style.width = "0%";
    document.getElementById("overlay").style.height = "0%";
}
let index = 0;

function moveSlide(direction) {
    const slides = document.querySelectorAll('.carousel-item');
    const totalSlides = slides.length;

    index = (index + direction + totalSlides) % totalSlides;
    document.querySelector('.carousel').style.transform = `translateX(-${index * 100}%)`;
}

setInterval(() => {
    moveSlide(1);  // Tự động chuyển sang slide tiếp theo sau mỗi 8 giây
}, 6000);  // Thời gian thay đổi giữa các ảnh (8 giây)
