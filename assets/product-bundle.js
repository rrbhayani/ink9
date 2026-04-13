class ProductBundle {
  constructor(section) {
    this.section = section;
    this.bundleButton = section.querySelector('.bundle-button');
    this.checkboxes = section.querySelectorAll('.bundle-item-checkbox');
    this.bundleTotalElement = section.querySelector('[data-bundle-total]');
    this.variantPrices = new Map();
    
    this.init();
  }

  init() {
    // Store variant prices from data attributes and dropdowns
    this.variantDropdowns = this.section.querySelectorAll('.bundle-variant-dropdown');
    this.productVariants = new Map(); // Store all variants for each product
    
    // Store initial variant prices
    this.checkboxes.forEach(checkbox => {
      const variantId = checkbox.dataset.variantId;
      const priceElement = checkbox.closest('.bundle-item-wrapper')?.querySelector('.bundle-item-price') || 
                          checkbox.closest('.bundle-item')?.querySelector('.bundle-item-price');
      if (priceElement && priceElement.dataset.price) {
        const priceValue = parseInt(priceElement.dataset.price, 10);
        this.variantPrices.set(variantId, priceValue);
      }
    });

    // Store all variant prices from dropdowns
    this.variantDropdowns.forEach(dropdown => {
      const productId = dropdown.dataset.productId;
      const variants = {};
      
      Array.from(dropdown.options).forEach(option => {
        if (option.value && option.dataset.price) {
          variants[option.value] = {
            id: option.value,
            price: parseInt(option.dataset.price, 10),
            available: !option.disabled
          };
        }
      });
      
      this.productVariants.set(productId, variants);
    });

    // Add event listeners to checkboxes
    this.checkboxes.forEach(checkbox => {
      if (!checkbox.disabled) {
        checkbox.addEventListener('change', () => this.updateBundleTotal());
      }
    });

    // Add event listeners to variant dropdowns
    this.variantDropdowns.forEach(dropdown => {
      dropdown.addEventListener('change', (e) => this.handleVariantChange(e));
    });

    // Add event listener to bundle button
    if (this.bundleButton) {
      this.bundleButton.addEventListener('click', () => this.addBundleToCart());
    }
  }

  handleVariantChange(event) {
    const dropdown = event.target;
    const productId = dropdown.dataset.productId;
    const selectedVariantId = dropdown.value;
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const variantPrice = parseInt(selectedOption.dataset.price, 10);

    // Update variant price in map
    this.variantPrices.set(selectedVariantId, variantPrice);

    // Find the checkbox and price element for this product
    const bundleItemWrapper = dropdown.closest('.bundle-item-wrapper');
    if (bundleItemWrapper) {
      const checkbox = bundleItemWrapper.querySelector('.bundle-item-checkbox');
      const priceElement = bundleItemWrapper.querySelector('.bundle-item-price');
      
      if (checkbox) {
        // Update checkbox variant ID
        checkbox.dataset.variantId = selectedVariantId;
        // Ensure product ID is set
        if (!checkbox.dataset.productId && productId) {
          checkbox.dataset.productId = productId;
        }
      }
      
      if (priceElement) {
        // Update price display and data attribute
        priceElement.dataset.price = variantPrice;
        priceElement.textContent = this.formatMoney(variantPrice);
        // Ensure product ID is set
        if (!priceElement.dataset.productId && productId) {
          priceElement.dataset.productId = productId;
        }
      }
    }

    // Update bundle total
    this.updateBundleTotal();
  }

  updateBundleTotal() {
    let total = 0;
    
    // Get main product price (if included)
    const includeMainProduct = this.bundleButton?.dataset.includeMainProduct === 'true';
    if (includeMainProduct) {
      // Main product checkbox is enabled, check if it's checked
      // Find the checkbox that has "This item:" label or is the first one
      const bundleItems = this.section.querySelectorAll('.bundle-item');
      if (bundleItems.length > 0) {
        const firstItem = bundleItems[0];
        const mainCheckbox = firstItem.querySelector('.bundle-item-checkbox');
        if (mainCheckbox && mainCheckbox.checked) {
          const mainVariantId = mainCheckbox.dataset.variantId;
          total += this.variantPrices.get(mainVariantId) || 0;
        }
      }
    } else {
      // Main product is always included (disabled checkbox)
      const mainCheckbox = this.section.querySelector('.bundle-item-checkbox[disabled]');
      if (mainCheckbox) {
        const mainVariantId = mainCheckbox.dataset.variantId;
        total += this.variantPrices.get(mainVariantId) || 0;
      }
    }

    // Add prices of checked bundle items (skip main product if includeMainProduct is true)
    this.checkboxes.forEach(checkbox => {
      if (!checkbox.disabled && checkbox.checked) {
        // Skip if this is the main product checkbox when includeMainProduct is true
        if (includeMainProduct) {
          const bundleItem = checkbox.closest('.bundle-item');
          const bundleItems = this.section.querySelectorAll('.bundle-item');
          if (bundleItem === bundleItems[0]) {
            return; // Skip main product, already counted above
          }
        }
        const variantId = checkbox.dataset.variantId;
        total += this.variantPrices.get(variantId) || 0;
      }
    });

    // Update total display
    if (this.bundleTotalElement) {
      this.bundleTotalElement.textContent = this.formatMoney(total);
    }
  }

  formatMoney(cents) {
    // Use Shopify's money format if available
    if (window.Shopify && window.Shopify.formatMoney) {
      return window.Shopify.formatMoney(cents, window.money_format || '{{amount}}');
    }
    // Fallback to Intl formatter
    return new Intl.NumberFormat(document.documentElement.lang || 'en', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD',
      minimumFractionDigits: 2
    }).format(cents / 100);
  }

  async addBundleToCart() {
    if (!this.bundleButton || this.bundleButton.disabled) return;

    // Disable button and show loading state
    this.bundleButton.disabled = true;
    const originalHTML = this.bundleButton.innerHTML;
    this.bundleButton.innerHTML = '<span class="material-symbols-outlined bundle-button-icon">hourglass_empty</span> Adding...';

    try {
      const items = [];
      const includeMainProduct = this.bundleButton?.dataset.includeMainProduct === 'true';
      
      // Helper function to get product ID from checkbox or dropdown
      const getProductId = (element) => {
        const productId = element.dataset.productId;
        if (productId) return productId;
        // Try to find product ID from closest bundle-item-wrapper
        const wrapper = element.closest('.bundle-item-wrapper');
        if (wrapper) {
          const checkbox = wrapper.querySelector('.bundle-item-checkbox');
          if (checkbox) return checkbox.dataset.productId;
        }
        return null;
      };

      // Helper function to get current variant ID (from checkbox or dropdown)
      const getCurrentVariantId = (productId) => {
        // Check if there's a variant dropdown for this product
        const dropdown = this.section.querySelector(`.bundle-variant-dropdown[data-product-id="${productId}"]`);
        if (dropdown) {
          return dropdown.value;
        }
        // Fallback to checkbox variant ID
        const checkbox = this.section.querySelector(`.bundle-item-checkbox[data-product-id="${productId}"]`);
        if (checkbox) return checkbox.dataset.variantId;
        return null;
      };
      
      // Add main product (if included)
      if (includeMainProduct) {
        // Main product checkbox is enabled, check if it's checked
        const bundleItems = this.section.querySelectorAll('.bundle-item');
        if (bundleItems.length > 0) {
          const firstItem = bundleItems[0];
          const mainCheckbox = firstItem.querySelector('.bundle-item-checkbox');
          if (mainCheckbox && mainCheckbox.checked) {
            const productId = mainCheckbox.dataset.productId;
            const variantId = getCurrentVariantId(productId);
            if (variantId && productId) {
              items.push({
                id: variantId,
                quantity: 1,
                properties: {
                  'bundle': `ink9-bundle-${productId}`
                }
              });
            }
          }
        }
      } else {
        // Main product is always included (disabled checkbox)
        const mainCheckbox = this.section.querySelector('.bundle-item-checkbox[disabled]');
        if (mainCheckbox) {
          const productId = mainCheckbox.dataset.productId;
          const variantId = getCurrentVariantId(productId);
          if (variantId && productId) {
            items.push({
              id: variantId,
              quantity: 1,
              properties: {
                'bundle': `ink9-bundle-${productId}`
              }
            });
          }
        }
      }

      // Add checked bundle items (skip main product if includeMainProduct is true)
      this.checkboxes.forEach(checkbox => {
        if (!checkbox.disabled && checkbox.checked) {
          // Skip if this is the main product checkbox when includeMainProduct is true
          if (includeMainProduct) {
            const bundleItem = checkbox.closest('.bundle-item');
            const bundleItems = this.section.querySelectorAll('.bundle-item');
            if (bundleItem === bundleItems[0]) {
              return; // Skip main product, already added above
            }
          }
          
          const productId = checkbox.dataset.productId;
          const variantId = getCurrentVariantId(productId);
          if (variantId && productId) {
            items.push({
              id: variantId,
              quantity: 1,
              properties: {
                'bundle': `ink9-bundle-${productId}`
              }
            });
          }
        }
      });

      if (items.length === 0) {
        throw new Error('No items selected');
      }

      // Get cart drawer/notification to request sections
      const cartDrawer = document.querySelector('cart-drawer');
      const cartNotification = document.querySelector('cart-notification');
      const sectionsToRequest = [];
      
      if (cartDrawer && typeof cartDrawer.getSectionsToRender === 'function') {
        sectionsToRequest.push(...cartDrawer.getSectionsToRender().map(s => s.id));
      }
      if (cartNotification && typeof cartNotification.getSectionsToRender === 'function') {
        sectionsToRequest.push(...cartNotification.getSectionsToRender().map(s => s.id));
      }

      // Use JSON format for multiple items with properties
      // Try to include sections in the request if possible
      const requestBody = {
        items: items
      };
      
      // For JSON requests, sections need to be fetched separately
      // But we'll try to include them in the URL if Shopify supports it
      let cartAddUrl = `${window.Shopify.routes.root}cart/add.js`;
      if (sectionsToRequest.length > 0) {
        // Some Shopify versions support sections parameter in URL
        cartAddUrl += `?sections=${sectionsToRequest.join(',')}`;
      }

      // Add all items to cart using XHR with Shopify cart API
      const response = await fetch(cartAddUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(requestBody)
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        // If response is not JSON, try to get text
        const text = await response.text();
        throw new Error(`Invalid response: ${text}`);
      }

      // Check for errors in response (Shopify can return 200 with errors)
      if (!response.ok) {
        const errorMessage = responseData?.description || responseData?.message || `HTTP ${response.status}: Failed to add items to cart`;
        throw new Error(errorMessage);
      }

      // Check if response has error status
      if (responseData.status === 422 || responseData.status === 'error' || (responseData.description && responseData.description !== '' && !responseData.items)) {
        const errorMessage = responseData.description || responseData.message || 'Failed to add items to cart';
        throw new Error(errorMessage);
      }

      // Check if response already includes sections (from URL parameter)
      const hasSectionsInResponse = responseData.sections && Object.keys(responseData.sections).length > 0;
      
      if (hasSectionsInResponse) {
        // Response includes sections, use them directly
        await this.updateCartSections(responseData, cartDrawer, cartNotification, items);
      } else {
        // No sections in response, fetch them separately
        // Small delay to ensure cart state is fully updated on server before fetching sections
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.updateCartSections(responseData, cartDrawer, cartNotification, items);
      }

      // Show success message
      this.bundleButton.innerHTML = '<span class="material-symbols-outlined bundle-button-icon">check_circle</span> Added!';
      
      // Reset button after 2 seconds
      setTimeout(() => {
        this.bundleButton.innerHTML = originalHTML;
        this.bundleButton.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      this.bundleButton.innerHTML = '<span class="material-symbols-outlined bundle-button-icon">error</span> Error';
      
      setTimeout(() => {
        this.bundleButton.innerHTML = originalHTML;
        this.bundleButton.disabled = false;
      }, 3000);
    }
  }

  async updateCartSections(cartData, cartDrawer, cartNotification, items = []) {
    try {
      // Fetch fresh cart data to ensure we have the latest state
      const finalCartData = await fetch(`${window.Shopify.routes.root}cart.js`).then(r => r.json());
      
      // Publish cart update event first (if available)
      if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'product-bundle',
          cartData: finalCartData
        });
      }

      // Dispatch custom cart updated event
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: finalCartData }));
      
      // Remove is-empty class from cart drawer if present (important for empty cart state)
      if (cartDrawer) {
        cartDrawer.classList.remove('is-empty');
        const drawerInner = cartDrawer.querySelector('.drawer__inner');
        if (drawerInner) {
          drawerInner.classList.remove('is-empty');
        }
      }
      
      // Always fetch sections separately for reliability with JSON requests
      if (cartDrawer || cartNotification) {
          const sections = [];
          if (cartDrawer && typeof cartDrawer.getSectionsToRender === 'function') {
            sections.push(...cartDrawer.getSectionsToRender().map(s => s.id));
          }
          if (cartNotification && typeof cartNotification.getSectionsToRender === 'function') {
            sections.push(...cartNotification.getSectionsToRender().map(s => s.id));
          }

          if (sections.length > 0) {
            // Fetch sections with updated cart state - use sections_url parameter
            const sectionsUrl = `${window.Shopify.routes.root}?sections=${sections.join(',')}&sections_url=${encodeURIComponent(window.location.pathname)}`;
            const response = await fetch(sectionsUrl, {
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch cart sections: ${response.status}`);
            }
            
            const html = await response.text();
            let sectionsHTML = {};
            
            try {
              sectionsHTML = JSON.parse(html);
            } catch (e) {
              console.error('Error parsing sections HTML:', e, html.substring(0, 200));
              throw new Error('Failed to parse cart sections');
            }

            // Verify sections were returned
            if (!sectionsHTML || Object.keys(sectionsHTML).length === 0) {
              console.error('No sections returned from server', sectionsHTML);
              throw new Error('No cart sections returned');
            }

            // Format sections for renderContents (it expects sections property)
            // The sections object should have keys matching the section IDs
            // Also need to include product ID if available (from first item)
            const formattedResponse = {
              sections: sectionsHTML,
              id: items.length > 0 ? items[0].id : null
            };

            // Update cart drawer
            if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
              cartDrawer.setActiveElement(this.bundleButton);
              try {
                // Ensure is-empty class is removed before rendering
                cartDrawer.classList.remove('is-empty');
                const drawerInner = cartDrawer.querySelector('.drawer__inner');
                if (drawerInner) {
                  drawerInner.classList.remove('is-empty');
                }
                
                cartDrawer.renderContents(formattedResponse);
                // renderContents automatically opens the drawer and removes is-empty class
              } catch (e) {
                console.error('Error rendering cart drawer:', e, formattedResponse);
                // Fallback: try to open drawer manually
                cartDrawer.classList.remove('is-empty');
                if (typeof cartDrawer.open === 'function') {
                  cartDrawer.setActiveElement(this.bundleButton);
                  cartDrawer.open(this.bundleButton);
                }
              }
            }

            // Update cart notification
            if (cartNotification && typeof cartNotification.renderContents === 'function') {
              try {
                cartNotification.renderContents(formattedResponse);
                // renderContents automatically opens the notification
              } catch (e) {
                console.error('Error rendering cart notification:', e);
                // Fallback: try to open notification manually
                if (typeof cartNotification.open === 'function') {
                  cartNotification.open();
                }
              }
            }
          } else {
            // If no sections to render, still try to open cart drawer
            if (cartDrawer && typeof cartDrawer.open === 'function') {
              cartDrawer.setActiveElement(this.bundleButton);
              cartDrawer.open(this.bundleButton);
            } else if (cartNotification && typeof cartNotification.open === 'function') {
              cartNotification.open();
            }
          }
      }
    } catch (error) {
      console.error('Error updating cart sections:', error);
      // Don't throw - allow the success message to show even if cart update fails
      // But still try to open the cart drawer
      if (cartDrawer && typeof cartDrawer.open === 'function') {
        cartDrawer.setActiveElement(this.bundleButton);
        cartDrawer.open(this.bundleButton);
      }
    }
  }
}

// Initialize bundles on page load
function initBundles() {
  const bundleSections = document.querySelectorAll('.bundle-section');
  bundleSections.forEach(section => {
    if (!section.dataset.bundleInitialized) {
      new ProductBundle(section);
      section.dataset.bundleInitialized = 'true';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBundles);
} else {
  initBundles();
}

// Re-initialize if section is added dynamically (theme editor)
if (typeof document.addEventListener !== 'undefined') {
  document.addEventListener('shopify:section:load', initBundles);
}
