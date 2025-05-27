// Script cho hiệu ứng hover hoặc tương tác khi nhấn vào các biểu tượng
document.querySelectorAll('.icon').forEach(item => {
    item.addEventListener('click', () => {
      alert('Bạn đã nhấn vào ' + item.classList[1]);
    });
  });
  let currentIndex = 0; // Chỉ số hiện tại của item trong carousel
const items = document.querySelectorAll('.carousel-item');
const totalItems = items.length;

function nextSlide() {
  currentIndex = (currentIndex + 1) % totalItems;
  updateCarousel();
}

function prevSlide() {
  currentIndex = (currentIndex - 1 + totalItems) % totalItems;
  updateCarousel();
}

function updateCarousel() {
  const offset = -currentIndex * 100; // Dịch chuyển carousel
  document.querySelector('.carousel').style.transform = `translateX(${offset}%)`;
}

// Tự động di chuyển carousel sau mỗi 6 giây
setInterval(nextSlide, 6000);

// Chuyển carousel khi nhấn vào các nút
document.querySelector('.next-btn').addEventListener('click', nextSlide);
document.querySelector('.prev-btn').addEventListener('click', prevSlide);
document.addEventListener("DOMContentLoaded", function () {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const carousel = document.querySelector('.carousel');

    let currentIndex = 0;

    // Next Button
    nextBtn.addEventListener('click', () => {
        if (currentIndex < 2) {
            currentIndex++;
        } else {
            currentIndex = 0;
        }
        updateCarousel();
    });

    // Prev Button
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = 2;
        }
        updateCarousel();
    });

    // Update carousel position
    function updateCarousel() {
        const offset = -100 * currentIndex;
        carousel.style.transform = `translateX(${offset}%)`;
    }
});
  document.addEventListener("DOMContentLoaded", function () {
    const thongbaoNen = document.getElementById("thongbao-nen");
    const thongbaoButton = document.getElementById("thongbao-button");

    // Đảm bảo body không cuộn khi hiển thị popup
    document.body.style.overflow = 'hidden';

    thongbaoNen.style.display = "flex";

    thongbaoButton.onclick = function () {
      thongbaoNen.style.display = "none";
      document.body.style.overflow = 'auto'; // Mở lại cuộn
    };
  });
  function toggleNav() {
    const sidenav = document.getElementById("mySidenav");
    if (sidenav.style.width === "300px") {
      closeNav(); // đang mở => đóng
    } else {
      openNav(); // đang đóng => mở
    }
  }
  
  function openNav() {
    document.getElementById("mySidenav").style.width = "300px";
  }
  
  function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
  }
  const scrollBtn = document.querySelector(".scrollToTop");

  window.addEventListener("scroll", function () {
    scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
  });

  scrollBtn.addEventListener("click", function (e) {
    e.preventDefault();
    smoothScrollToTop();
  });

  function smoothScrollToTop() {
    const currentPosition = window.scrollY;
    if (currentPosition > 0) {
      window.scrollTo(0, currentPosition - currentPosition / 15);
      requestAnimationFrame(smoothScrollToTop);
    }
  }
  // Toggle khung tìm kiếm
  function toggleSearch() {
    const box = document.getElementById("searchBox");
    box.style.display = box.style.display === "flex" ? "none" : "flex";
  }

  // Tự đóng khi click ra ngoài
  document.addEventListener("click", function (event) {
    const searchBox = document.getElementById("searchBox");
    const toggleBtn = document.querySelector(".search-toggle");

    if (
      searchBox.style.display === "flex" &&
      !searchBox.contains(event.target) &&
      !toggleBtn.contains(event.target)
    ) {
      searchBox.style.display = "none";
    }
  });