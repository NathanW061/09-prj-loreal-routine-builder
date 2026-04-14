/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

const appState = {
  selectedProducts: {},
  selectedProductOrder: [],

  // Marks a product as selected and adds it to the selected product order
  selectProduct: function(id)
  {
    if(!(id in this.selectedProducts))
    {
      const ind = this.selectedProductOrder.length;
      this.selectedProducts[id] = {index: ind};
      this.selectedProductOrder.push(id);
    }
  },
  
  // Unmarks a product as selected and removes it from the selected product order
  deselectProduct: function(id)
  {
    if(id in this.selectedProducts)
    {
      const data = this.selectedProducts[id];
      const ind = data.index;

      // Remove the product
      delete this.selectedProducts[id];
      this.selectedProductOrder.splice(ind, 1);

      // Adjust position of all products in the list after
      for(const i = ind; i < this.selectedProductOrder.length; i ++)
      {
        const currentId = this.selectedProductOrder[i];
        this.selectedProducts[currentId].index = i;
      }
    }
  },

  //setProductSelected: function(id, selected)
  //{
  //  if(this.isProductSelected(id) == selected)
  //    return;
//
  //  if(this.selected)
  //    this.selectProduct(id);
  //  else
  //    this.deselectProduct(id);
  //},

  isProductSelected: function(id)
  {
    return (id in this.selectedProducts);
  }
};

const appView = {
  /* Product grid container */
  cardPrefix: "product-",
  productsContainer: document.getElementById("productsContainer"),

  addProductCard: function(product)
  {
    const productDiv = document.createElement('div');
    productDiv.className = "product-card";
    productDiv.id = this.cardPrefix + product.id;

    productDiv.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <div class="product-info">
      <h3>${product.name}</h3>
      <p>${product.brand}</p>
    </div>
    `;

    // Add click event handler to product card
    productDiv.addEventListener('click', () => {
      const isSelected = appState.isProductSelected(product.id);

      if(isSelected)
      {
        appState.deselectProduct(product.id);
        appView.setProductCardSelected(product.id, false);
        appView.removeProductFromSelectedListDiv(product.id);

        console.log(`Deselected '${product.name}'`);
      }
      else
      {
        appState.selectProduct(product.id);
        appView.setProductCardSelected(product.id, true);
        appView.addProductToSelectedListDiv(product);

        console.log(`Selected '${product.name}'`);
      }

      void productDiv.offsetWidth;
    });

    this.productsContainer.appendChild(productDiv);
  },

  setProductCardSelected: function(productId, selected)
  {
    const productDiv = document.getElementById(this.cardPrefix + productId);
    const cardIsSelected = productDiv.classList.contains('selected');

    if(cardIsSelected == selected)
      return;

    if(selected)
    {
      productDiv.classList.add('selected');
    }
    else
    {
      productDiv.classList.remove('selected');
    }
  },

  removeProductCard: function(productId)
  {
    const productDiv = document.getElementById(this.cardPrefix + productId);
    productDiv.remove();
  },
  
  /* Selected product list container */
  listItemPrefix: "productItem-",
  selectedProductsList: document.getElementById("selectedProductsList"),

  addProductToSelectedListDiv: function(product)
  {
    const listItem = document.createElement('div');
    listItem.id = this.listItemPrefix + product.id;
    listItem.textContent = product.name;

    this.selectedProductsList.appendChild(listItem);
  },

  removeProductFromSelectedListDiv: function(productId)
  {
    const listItem = document.getElementById(this.listItemPrefix + productId);
    listItem.remove();
  }
};

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = '';
  for(const product of products)
  {
    appView.addProductCard(product);

    if(appState.isProductSelected(product.id))
      appView.setProductCardSelected(product.id);
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
});
