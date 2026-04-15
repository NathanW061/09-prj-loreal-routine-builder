/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const chatForm = document.getElementById("chatForm");

const appState = {
  selectedProducts: {},
  selectedProductOrder: [],
  viewingProduct: null,

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
      for(let i = ind; i < this.selectedProductOrder.length; i ++)
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
  },

  // Changes which product is currently being viewed
  viewProduct: function(id)
  {
    this.viewingProduct = id;
  },

  isProductBeingViewed: function(id)
  {
    return (this.viewingProduct == id);
  },

  /* OpenAI interactions */
  messageHistory: [],
  resetMessageHistory: function()
  {
    this.messageHistory = [
      {
        role: 'system',
        content: 'You are a chatbot that answers questions about, and gives advice/recommendations related to, L\'Oréal brand products. If the user asks a question that would be relevant to one or more L\'Oréal product(s) or the products L\'Oréal carries in general, such as beauty-related topics, go ahead and answer them. Otherwise, politely decline to answer the question and offer suggestions on topics you can respond to.'
      }
    ];
  },

  getRoutineRequest: async function()
  {
    return fetch('https://loreal-chatbot-security.nathan-winkel.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: this.messageHistory
      })
    });
  }
};

const appView = {
  currentCategory: null,

  /* Product grid container */
  cardPrefix: "product-",
  productsContainer: document.getElementById("productsContainer"),

  // Adds a product card to the products grid container
  addProductCard: function(product)
  {
    const divId = this.cardPrefix + product.id;
    if(document.getElementById(divId))
      return;

    const productDiv = document.createElement('div');
    productDiv.className = "product-card";
    productDiv.id = divId;

    productDiv.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <div class="product-info">
      <h3>${product.name}</h3>
      <p>${product.brand}</p>
    </div>
    `;

    const addButton = document.createElement('button');
    addButton.className = 'add-item';
    addButton.textContent = 'add';
    addButton.addEventListener('click', (e) => {
      e.stopPropagation();
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
    productDiv.children[1].appendChild(addButton);

    // Add click event handler to product card
    productDiv.addEventListener('click', () => {
      if(appState.isProductBeingViewed(product.id))
      {
        appState.viewProduct(null);
        appView.setProductCardViewing(null);
        appView.setProductInfoTarget(null);
      }
      else
      { 
        appState.viewProduct(product.id);
        appView.setProductCardViewing(product.id);
        appView.setProductInfoTarget(product);
      }
    });

    this.productsContainer.appendChild(productDiv);
  },

  // Sets the product card being viewed
  class_viewing: 'viewing',
  setProductCardViewing: function(productId)
  {
    const oldProductDiv = document.getElementsByClassName(this.class_viewing);
    if(oldProductDiv.length > 0)
    {
      oldProductDiv[0].classList.remove(this.class_viewing);
    }
    
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if(!(productDiv))
      return;

    productDiv.classList.add(this.class_viewing);
  },

  // Sets the selection state of a product card
  class_selected: 'selected',
  setProductCardSelected: function(productId, selected)
  {
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if(!(productDiv))
      return;

    const cardIsSelected = productDiv.classList.contains(this.class_selected);

    if(cardIsSelected == selected)
      return;

    const button = productDiv.children[1].lastChild;

    if(selected)
    {
      productDiv.classList.add(this.class_selected);
      button.textContent = "remove";
    }
    else
    {
      productDiv.classList.remove(this.class_selected);
      button.textContent = "add";
    }
  },

  // Removes a product card from the products grid container
  removeProductCard: function(productId)
  {
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if(productDiv)
      productDiv.remove();
  },
  
  /* Product information view */
  setProductInfoTarget: function(product)
  {
    const productInfoContainer = document.getElementById("product-information");

    if(!(product))
    {
      productInfoContainer.style.display = "none";
      return;
    }
    else
    {
      productInfoContainer.style = '';

      const productImg = document.getElementById("product-img");
      productImg.setAttribute('src', product.image);
      productImg.setAttribute('alt', product.name);

      document.getElementById('product-info-name').textContent = product.name;
      document.getElementById('product-info-brand').textContent = product.brand;
      document.getElementById('product-info-description').textContent = product.description;

      
    }
  },

  /* Selected product list container */
  listItemPrefix: "productItem-",
  selectedProductsList: document.getElementById("selectedProductsList"),

  // Adds a list item to the selected product list
  addProductToSelectedListDiv: function(product)
  {
    const listItem = document.createElement('div');
    listItem.id = this.listItemPrefix + product.id;
    listItem.className = 'product-list-item';
    listItem.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-identifier">
        <div class="name">${product.name}</div>
        <div class="brand">${product.brand}</div>
      </div>
    `;

    const closeButton = document.createElement('button');
    closeButton.className = 'rem-item';
    closeButton.textContent = 'close';
    closeButton.addEventListener('click', () => {
      appView.removeProductFromSelectedListDiv(product.id);
      appView.setProductCardSelected(product.id, false);
      appState.deselectProduct(product.id);
    });
    listItem.appendChild(closeButton);

    this.selectedProductsList.appendChild(listItem);
  },

  // Removes a list item from the selected product list
  removeProductFromSelectedListDiv: function(productId)
  {
    const listItem = document.getElementById(this.listItemPrefix + productId);
    listItem.remove();
  },

  /* Event handlers and prewritten functions */
  // Create HTML for displaying product cards
  displayProducts: function(products) {
    this.setProductCardViewing(null);
    this.setProductInfoTarget(null);
    appState.viewProduct(null);

    this.productsContainer.innerHTML = '';
    for(const product of products)
    {
      this.addProductCard(product);

      if(appState.isProductSelected(product.id))
        this.setProductCardSelected(product.id, true);
    }
  },

  onCategoryFilterChange: function(allProducts, newCategory)
  {
    if(this.categoryFilter === newCategory)
      return;
    this.categoryFilter = newCategory;
    
    /* filter() creates a new array containing only products 
       where the category matches what the user selected */
    const filteredProducts = allProducts.filter(
      (product) => product.category === newCategory
    );

    this.displayProducts(filteredProducts);
  }
};

/* Reused from Project 8 */
appView['chatView'] = {
  window: document.getElementById("chatWindow"),
  form: document.getElementById("chatForm"),
  input: document.getElementById("userInput"),
  submit: document.getElementById("sendBtn"),

  // Returns a Promise that completes after a given amount of ms
  delay: function(time)
  {
    return new Promise(resolve => setTimeout(resolve, time));
  },

  // Appends a system message to the chat window
  appendSystemMessage: function(content, italic)
  {
    const entry = document.createElement('div');
    entry.className = `msg-entry system`;

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    if(italic)
      bubble.classList.add('italic');
    bubble.textContent = content;

    entry.appendChild(bubble);
    this.window.appendChild(entry);

    return entry;
  },

  // Appends a "user" message to the chat window
  appendMessage: function(content, sentBy)
  {
    const entry = document.createElement('div');
    entry.className = `msg-entry ${sentBy}`;

    const authorTxt = document.createElement('span');
    authorTxt.className = 'msg-author';
    authorTxt.textContent = sentBy === 'user' ? 'You said:' : 'Smart Product Advisor said:';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = content;

    entry.appendChild(authorTxt);
    entry.appendChild(bubble);
    this.window.appendChild(entry);
  },

  // Removes a system message from the chat window
  removeSystemMessage: async function(entry)
  {
    // Hack to restart animations to make speech bubble visually shrink when deleted
    entry.children.item(0).style.animationName = 'none';
    entry.classList.add('hiding');
    void entry.offsetWidth;
    entry.children.item(0).style.animationName = null;
    await this.delay(250);
    entry.remove();
  },

  // Sets whether the chat window's input and submit controls are enabled or not
  enableInput: function(enabled)
  {
    this.input.disabled = !enabled;
    this.submit.disabled = !enabled;
  },

  // Retrieve the message the user intends to send to the OpenAI API and display it in the chat window
  submitUserMessage: async function()
  {
    const userMessage = this.input.value;
    this.appendMessage(userMessage, 'user');
    this.input.value = '';
    this.enableInput(false);
    await this.delay(250);
    return userMessage;
  },

  // Shows a system message indicating that a request is being sent, and remove it after the request is responded to
  showSystemThinkingFor: async function(fetchPromise)
  {
    const sysWaitingMsg = this.appendSystemMessage('Thinking...', true);
    const response = await fetchPromise;
    await this.removeSystemMessage(sysWaitingMsg);
    return response;
  },

  // Show a failure message and reenable input for when a request fails
  showSystemFailure: function()
  {
    this.appendSystemMessage('Oops! Something went wrong, please try again.', false);
    this.enableInput(true);
  },

  // Show the response to a message a user sent and reenable input
  showMessageResponse: function(data)
  {
    let botMessage = data.choices[0].message.content;
    botMessage = botMessage.replace('**', ''); // Remove attempts at bold Markdown formatting
    this.appendMessage(botMessage, 'bot');
    this.enableInput(true);
  }
};

/* Show initial placeholder until user selects a category */
appView.productsContainer.innerHTML = `
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

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
  appView.onCategoryFilterChange(products, selectedCategory);
});

/* Chat form submission handler - placeholder for OpenAI integration */
appView.chatView.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userMessage = await appView.chatView.submitUserMessage();
  appState.messageHistory.push({
    role: 'user',
    content: userMessage
  });

  const response = await appView.chatView.showSystemThinkingFor(appState.getRoutineRequest());
  if(!response.ok)
  {
    appView.chatView.showSystemFailure();
    return;
  }
  const data = await response.json();

  await appView.chatView.showMessageResponse(data);
});
