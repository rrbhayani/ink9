class CollectionListSlider {
  constructor(wrapper) {
    this.wrapper = wrapper;
    this.slider = wrapper.querySelector('[id^="Slider-"]');
    this.slides = wrapper.querySelectorAll('[id^="Slide-"]');
    this.prevButton = wrapper.querySelector('[data-slider-prev]');
    this.nextButton = wrapper.querySelector('[data-slider-next]');
    this.currentIndex = 0;
    this.totalItems = parseInt(wrapper.dataset.totalItems) || this.slides.length;
    this.isAnimating = false;
    this.slideWidth = 0;
    this.visibleSlides = 0;
    
    if (!this.slider || this.slides.length === 0) return;
    
    this.init();
  }

  init() {
    // Calculate slide width and visible slides
    this.calculateDimensions();
    
    // Setup event listeners
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.goToPrev());
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.goToNext());
    }
    
    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.calculateDimensions();
        this.updateSlider(false);
      }, 250);
    });
    
    // Initial update
    this.updateSlider(false);
  }

  calculateDimensions() {
    if (this.slides.length === 0) return;
    
    const firstSlide = this.slides[0];
    const secondSlide = this.slides[1];
    
    if (!firstSlide) {
      this.slideWidth = 0;
      this.visibleSlides = 1;
      return;
    }
    
    const sliderRect = this.slider.getBoundingClientRect();
    const slideWidth = firstSlide.offsetWidth;
    
    if (secondSlide) {
      const slideGap = secondSlide.offsetLeft - firstSlide.offsetLeft - slideWidth;
      this.slideWidth = slideWidth + slideGap;
    } else {
      this.slideWidth = slideWidth;
    }
    
    this.visibleSlides = Math.floor(sliderRect.width / this.slideWidth);
    
    // Ensure we show at least 1 slide
    if (this.visibleSlides < 1) {
      this.visibleSlides = 1;
    }
  }

  goToNext() {
    if (this.isAnimating) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.totalItems;
    this.updateSlider(true);
  }

  goToPrev() {
    if (this.isAnimating) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.totalItems) % this.totalItems;
    this.updateSlider(true);
  }

  updateSlider(smooth = true) {
    if (this.isAnimating || this.slides.length === 0) return;
    
    this.isAnimating = true;
    
    // Recalculate dimensions in case they changed
    this.calculateDimensions();
    
    // Get the target slide
    const targetSlide = this.slides[this.currentIndex];
    if (!targetSlide) {
      this.isAnimating = false;
      return;
    }
    
    // Check if mobile (for centering)
    const isMobile = window.innerWidth <= 749;
    
    let scrollPosition;
    if (isMobile) {
      // On mobile, center the slide
      const sliderRect = this.slider.getBoundingClientRect();
      const slideRect = targetSlide.getBoundingClientRect();
      const slideOffset = targetSlide.offsetLeft;
      const slideWidth = slideRect.width;
      const centerOffset = (sliderRect.width - slideWidth) / 2;
      scrollPosition = slideOffset - centerOffset;
    } else {
      // On tablet/desktop, align to start
      scrollPosition = targetSlide.offsetLeft;
    }
    
    // Smooth scroll to position
    this.slider.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: smooth ? 'smooth' : 'auto'
    });
    
    // Update counter
    const currentCounter = this.wrapper.querySelector('.slider-counter--current');
    if (currentCounter) {
      currentCounter.textContent = this.currentIndex + 1;
    }
    
    // Reset animation flag after scroll completes
    const animationTime = smooth ? 500 : 100;
    setTimeout(() => {
      this.isAnimating = false;
    }, animationTime);
  }
}

// Initialize all collection list sliders
document.addEventListener('DOMContentLoaded', () => {
  const sliders = document.querySelectorAll('.collection-list-slider-wrapper.has-mobile-slider, .collection-list-slider-wrapper.has-tablet-slider, .collection-list-slider-wrapper.has-desktop-slider');
  sliders.forEach(wrapper => {
    new CollectionListSlider(wrapper);
  });
});

// Re-initialize on section load (for Shopify theme editor)
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const wrapper = event.target.querySelector('.collection-list-slider-wrapper.has-mobile-slider, .collection-list-slider-wrapper.has-tablet-slider, .collection-list-slider-wrapper.has-desktop-slider');
    if (wrapper) {
      new CollectionListSlider(wrapper);
    }
  });
}
