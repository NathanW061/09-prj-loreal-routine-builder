// Back-end / application data and state
const appState = {
  products: null, // The list of products that can be selected
  selectedProducts: {}, // The IDs and indexes of selected products
  selectedProductOrder: [], // The order of the selected product IDs
  viewingProduct: null, // The product currently being viewed by the user

  // Loads product data from products.json
  loadProducts: async function () {
    const response = await fetch("products.json");
    const data = await response.json();
    this.products = {};
    for (const productObj of data.products) {
      this.products[productObj.id] = productObj;
    }
    return data.products;
  },

  // Local Storage (canned, not enough time to implement)
  //selectionStorageKey: "selectedProducts",
  //saveSelectionState: function () {
  //  localStorage.setItem(
  //    this.selectionStorageKey,
  //    JSON.stringify(this.selectedProducts),
  //  );
  //},
//
  //loadSelectionState: function () {
  //  const loadedSelection = localStorage.getItem(this.selectionStorageKey);
  //  if (loadedSelection !== null) {
  //    this.selectedProducts = JSON.parse(loadedSelection);
//
  //    let ind = 0;
  //    for (const productId in this.selectedProducts) {
  //      if (ind < this.selectedProductOrder) {
  //      }
  //      ind++;
  //    }
  //  }
  //},

  // Marks a product as selected and adds it to the selected product order
  selectProduct: function (id) {
    // Make sure the product isn't already selected
    if (!(id in this.selectedProducts)) {
      const ind = this.selectedProductOrder.length;
      this.selectedProducts[id] = { index: ind };
      this.selectedProductOrder.push(id);
    }
  },

  // Unmarks a product as selected and removes it from the selected product order
  deselectProduct: function (id) {
    // Make sure the product is selected
    if (id in this.selectedProducts) {
      const data = this.selectedProducts[id];
      const ind = data.index;

      // Remove the product
      delete this.selectedProducts[id];
      this.selectedProductOrder.splice(ind, 1);

      // Adjust position of all products in the order list that came after it
      for (let i = ind; i < this.selectedProductOrder.length; i++) {
        const currentId = this.selectedProductOrder[i];
        this.selectedProducts[currentId].index = i;
      }
    }
  },

  // Checks whether a specific product is currently selected
  isProductSelected: function (id) {
    return id in this.selectedProducts;
  },

  // Changes which product is currently being viewed
  viewProduct: function (id) {
    this.viewingProduct = id;
  },

  // Checks whether a specific product is currently being viewed
  isProductBeingViewed: function (id) {
    return this.viewingProduct == id;
  },

  /* OpenAI interactions */
  messageHistory: [], // The AI's message history used for emphasizing context

  // Resets the AI's message history, leaving only the base hint
  resetMessageHistory: function () {
    this.messageHistory = [];
    this.addSystemHint(
      "Please do not attempt to respond using Markdown format. If you can't, at least make sure not to include URLs if you are trying to include an image.",
    );
    this.addSystemHint(
      "You are a chatbot that answers questions about, and gives advice/recommendations related to, L'Oréal brand products. If the user asks a question that would be relevant to one or more L'Oréal product(s), products of beauty brands owned by L'Oréal (such as CeraVe), or the products L'Oréal carries in general, go ahead and answer them. These questions should preferably relate to beauty-related topics (skincare, haircare, makeup, fragrance, and especially beauty routine suggestions). If their question does not fall under the aforementioned criteria, politely decline to answer the question, offer suggestions on topics you can respond to, or suggest they select some products and build a routine with them.",
    );
  },

  // Adds a system message to the AI's message history
  addSystemHint: function (hintMessage) {
    this.messageHistory.push({
      role: "system",
      content: hintMessage,
    });
  },

  // Adds a user-sent message to the AI's message history
  addUserMessage: function (userMessage) {
    this.messageHistory.push({
      role: "user",
      content: userMessage,
    });
  },

  // Retrieves a fetch promise that sends a request including all messages to OpenAI's API
  getOpenAIFetchRequest: function () {
    return fetch("https://loreal-chatbot-security.nathan-winkel.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: this.messageHistory,
      }),
    });
  },

  // Appends a system message containing the user's currently selected products to the AI's message history
  submitRoutineProducts: function () {
    const routineProductSet = [];
    for (const productId in this.selectedProducts) {
      const product = this.products[productId];
      routineProductSet.push(product);
    }
    this.addSystemHint(
      `The user has selected these products to build a beauty routine with: ${JSON.stringify(routineProductSet)}`,
    );
  },
};

// Front-end / page controls
const appView = {
  categoryFilterField: document.getElementById("categoryFilter"), // The field used to set the category filter
  currentCategory: null, // The currently selected category of products to be displayed

  /* Product grid container */
  cardPrefix: "product-", // The prefix used for the IDs of product card div elements
  productsContainer: document.getElementById("productsContainer"), // The div that contains all product card divs

  // Adds a product card to the products grid container
  addProductCard: function (product) {
    // Skip adding if the product card div already exists
    const divId = this.cardPrefix + product.id;
    if (document.getElementById(divId)) return;

    // Create the product div
    const productDiv = document.createElement("div");
    productDiv.className = "product-card";
    productDiv.id = divId;
    productDiv.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <div class="product-info">
      <h3>${product.name}</h3>
      <p>${product.brand}</p>
    </div>
    `;

    // Create the 'add/remove' button and add a click handler that adds/removes the product to/from the selected products list
    const addButton = document.createElement("button");
    addButton.className = "add-item";
    addButton.textContent = "add";
    addButton.addEventListener("click", (e) => {
      e.stopPropagation();

      // Use toggle behavior to determine selection state of a given product
      const isSelected = appState.isProductSelected(product.id);
      if (isSelected) {
        // Deselect the product and update the front-end to reflect that
        appState.deselectProduct(product.id);
        appView.setProductCardSelected(product.id, false);
        appView.removeProductFromSelectedListDiv(product.id);

        console.log(`Deselected '${product.name}'`);
      } else {
        // Select the product and update the front-end to reflect that
        appState.selectProduct(product.id);
        appView.setProductCardSelected(product.id, true);
        appView.addProductToSelectedListDiv(product);

        console.log(`Selected '${product.name}'`);
      }

      void productDiv.offsetWidth;
    });

    // Add the button to the 'product-info' sub-div element of the product card
    productDiv.children[1].appendChild(addButton);

    // Add a click handler to the product card that displays more information (or hides it) about that product
    productDiv.addEventListener("click", () => {
      if (appState.isProductBeingViewed(product.id)) {
        // Stop viewing this product
        appState.viewProduct(null);
        appView.setProductCardViewing(null);
        appView.setProductInfoTarget(null);
      } else {
        // Set the product being viewed to the product that was clicked on
        appState.viewProduct(product.id);
        appView.setProductCardViewing(product.id);
        appView.setProductInfoTarget(product);
      }
    });

    // Add the product card div to the products container
    this.productsContainer.appendChild(productDiv);
  },

  class_viewing: "viewing", // The name of the class used to mark a product card as being "viewed"

  // Sets/removes the product card being viewed
  setProductCardViewing: function (productId) {
    // Remove the information of the product that's already being viewed if present
    const oldProductDiv = document.getElementsByClassName(this.class_viewing);
    if (oldProductDiv.length > 0) {
      oldProductDiv[0].classList.remove(this.class_viewing);
    }

    // Display the information of the product that the user wants to view (or hide it if they were viewing it already)
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if (!productDiv) return;
    productDiv.classList.add(this.class_viewing);
  },

  class_selected: "selected", // The name of the class used to mark a product card as being "selected"

  // Sets the selection state of a product card
  setProductCardSelected: function (productId, selected) {
    // Don't attempt to change the selection state of a product card that doesn't exist
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if (!productDiv) return;

    // Don't select a product card if its already selected, or deselect if its not already selected
    const cardIsSelected = productDiv.classList.contains(this.class_selected);
    if (cardIsSelected == selected) return;

    // Change the icon displayed on the button to reflect the new selection state of the product card
    // and add/remove the selected class to/from the product card to change its appearance
    const button = productDiv.children[1].lastChild;
    if (selected) {
      productDiv.classList.add(this.class_selected);
      button.textContent = "remove";
    } else {
      productDiv.classList.remove(this.class_selected);
      button.textContent = "add";
    }
  },

  // Removes a product card from the products grid container
  removeProductCard: function (productId) {
    // Remove the product card unless it doesn't exist
    const productDiv = document.getElementById(this.cardPrefix + productId);
    if (productDiv) productDiv.remove();
  },

  /* Product information view */
  // Show/hide the product information view
  setProductInfoTarget: function (product) {
    const productInfoContainer = document.getElementById("product-information");

    if (!product) {
      // Hide the product information view
      productInfoContainer.style.display = "none";
      return;
    } else {
      // Show the product information view
      productInfoContainer.style = "";

      // Set the product image to be displayed
      const productImg = document.getElementById("product-img");
      productImg.setAttribute("src", product.image);
      productImg.setAttribute("alt", product.name);

      // Set the product information to be displayed
      document.getElementById("product-info-name").textContent = product.name;
      document.getElementById("product-info-brand").textContent = product.brand;
      document.getElementById("product-info-description").textContent =
        product.description;
    }
  },

  /* Selected product list container */
  listItemPrefix: "productItem-", // The prefix used for the IDs of selected product div elements
  selectedProductsList: document.getElementById("selectedProductsList"), // The div that contains all selected products
  submitRoutineList: document.getElementById("generateRoutine"), // The button that submits the list of selected products to be made into a routine

  // Create the list item div
  createListItemDiv: function (product, id) {
    // Create the selected product div
    const listItem = document.createElement("div");
    if (id !== undefined) listItem.id = id;
    listItem.className = "product-list-item";
    listItem.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="product-identifier">
        <div class="name">${product.name}</div>
        <div class="brand">${product.brand}</div>
      </div>
    `;

    return listItem;
  },

  // Adds a list item to the selected product list
  addProductToSelectedListDiv: function (product) {
    // Create the selected product div
    const listItem = this.createListItemDiv(
      product,
      this.listItemPrefix + product.id,
    );
    //const listItem = document.createElement('div');
    //listItem.id = this.listItemPrefix + product.id;
    //listItem.className = 'product-list-item';
    //listItem.innerHTML = `
    //  <img src="${product.image}" alt="${product.name}">
    //  <div class="product-identifier">
    //    <div class="name">${product.name}</div>
    //    <div class="brand">${product.brand}</div>
    //  </div>
    //`;

    // Create the 'remove' button and add a click handler that removes the product from the selected products list
    const closeButton = document.createElement("button");
    closeButton.className = "rem-item";
    closeButton.textContent = "close";
    closeButton.addEventListener("click", () => {
      appView.removeProductFromSelectedListDiv(product.id);
      appView.setProductCardSelected(product.id, false);
      appState.deselectProduct(product.id);
    });
    listItem.appendChild(closeButton);

    // Add the selected product div to the selected product container
    this.selectedProductsList.appendChild(listItem);
  },

  // Removes a list item from the selected product list
  removeProductFromSelectedListDiv: function (productId) {
    const listItem = document.getElementById(this.listItemPrefix + productId);
    listItem.remove();
  },

  /* Event handlers and prewritten functions */
  // Create HTML for displaying product cards
  displayProducts: function (products) {
    this.setProductCardViewing(null);
    this.setProductInfoTarget(null);
    appState.viewProduct(null);

    this.productsContainer.innerHTML = "";
    for (const product of products) {
      this.addProductCard(product);

      if (appState.isProductSelected(product.id))
        this.setProductCardSelected(product.id, true);
    }
  },

  onCategoryFilterChange: function (allProducts, newCategory) {
    if (this.currentCategory === newCategory) return;
    this.currentCategory = newCategory;

    /* filter() creates a new array containing only products 
       where the category matches what the user selected */
    const filteredProducts = allProducts.filter(
      (product) => product.category === newCategory,
    );

    this.displayProducts(filteredProducts);
  },

  // Reused chat window design and funtionality from Project 8
  chatView: {
    window: document.getElementById("chatWindow"),
    form: document.getElementById("chatForm"),
    input: document.getElementById("userInput"),
    submit: document.getElementById("sendBtn"),

    // Returns a Promise that completes after a given amount of ms
    delay: function (time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },

    // Removes all messages from the chat window
    clearAllMessages: function () {
      this.window.innerHTML = "";
    },

    // Appends a message to the chat window
    appendMessageRaw: function (sender, contentFunc, authorFunc) {
      const entry = document.createElement("div");
      entry.className = `msg-entry ${sender}`;

      const bubble = document.createElement("div");
      bubble.className = "msg-bubble";

      if (authorFunc !== undefined && authorFunc !== null) {
        const authorTxt = document.createElement("span");
        authorTxt.className = "msg-author";

        authorFunc(authorTxt);
        entry.appendChild(authorTxt);
      }

      contentFunc(bubble);
      entry.appendChild(bubble);

      this.window.appendChild(entry);

      return entry;
    },

    // Appends a system message to the chat window
    appendSystemMessage: function (content, italic) {
      /*const entry = document.createElement('div');
      entry.className = `msg-entry system`;

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      if(italic)
        bubble.classList.add('italic');
      bubble.textContent = content;

      entry.appendChild(bubble);
      this.window.appendChild(entry);

      return entry;*/
      return this.appendMessageRaw("system", (bubble) => {
        if (italic) bubble.classList.add("italic");
        bubble.textContent = content;
      });
    },

    // Appends a "user" message to the chat window
    appendMessage: function (content, sentBy) {
      /*const entry = document.createElement('div');
      entry.className = `msg-entry ${sentBy}`;

      const authorTxt = document.createElement('span');
      authorTxt.className = 'msg-author';
      authorTxt.textContent = sentBy === 'user' ? 'You said:' : 'Smart Product Advisor said:';

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = content;

      entry.appendChild(authorTxt);
      entry.appendChild(bubble);
      this.window.appendChild(entry);*/

      this.appendMessageRaw(
        sentBy,
        (bubble) => {
          bubble.textContent = content;
        },
        (authorTxt) => {
          authorTxt.textContent =
            sentBy === "user" ? "You said:" : "Smart R&P Advisor said:";
        },
      );
    },

    // Removes a system message from the chat window
    removeSystemMessage: async function (entry) {
      // Hack to restart animations to make speech bubble visually shrink when deleted
      entry.children.item(0).style.animationName = "none";
      entry.classList.add("hiding");
      void entry.offsetWidth;
      entry.children.item(0).style.animationName = null;
      await this.delay(250);
      entry.remove();
    },

    // Sets whether the chat window's input and submit controls are enabled or not
    enableInput: function (enabled) {
      this.input.disabled = !enabled;
      this.submit.disabled = !enabled;
    },

    // Retrieve the message the user intends to send to the OpenAI API and display it in the chat window
    submitUserMessage: async function () {
      const userMessage = this.input.value;
      this.appendMessage(userMessage, "user");
      this.input.value = "";
      this.enableInput(false);
      await this.delay(250);
      return userMessage;
    },

    // Shows a system message indicating that a request is being sent, and remove it after the request is responded to
    showSystemThinkingFor: async function (fetchPromise) {
      const sysWaitingMsg = this.appendSystemMessage("Thinking...", true);
      const response = await fetchPromise;
      await this.removeSystemMessage(sysWaitingMsg);
      return response;
    },

    // Show a failure message and reenable input for when a request fails
    showSystemFailure: function () {
      this.appendSystemMessage(
        "Oops! Something went wrong, please try again.",
        false,
      );
      this.enableInput(true);
    },

    // Show the response to a message a user sent and reenable input
    showMessageResponse: function (data) {
      let botMessage = data.choices[0].message.content;
      botMessage = botMessage.replace("**", ""); // Remove attempts at bold Markdown formatting
      this.appendMessage(botMessage, "bot");
      this.enableInput(true);
    },
  },

  /* Chat form submission handler - placeholder for OpenAI integration */
  handleAIRequest: async function () {
    this.chatView.enableInput(false);
    const response = await this.chatView.showSystemThinkingFor(
      appState.getOpenAIFetchRequest(),
    );
    if (!response.ok) {
      this.chatView.showSystemFailure();
      this.chatView.enableInput(true);
      return;
    }
    const data = await response.json();
    this.chatView.showMessageResponse(data);
    this.chatView.enableInput(true);
  },

  // Appends a user routine message to the chat window
  appendRoutineMessage: function () {
    this.chatView.appendMessageRaw(
      "user",
      (bubble) => {
        for (const productId in appState.selectedProducts) {
          const product = appState.products[productId];
          bubble.appendChild(this.createListItemDiv(product));
        }
      },
      (authorTxt) => {
        authorTxt.textContent = "You selected:";
      },
    );
  },
};

// Reset the AI's message history on page load
appState.resetMessageHistory();

/* Show initial placeholder until user selects a category */
appView.productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Filter and display products when category changes */
appView.categoryFilterField.addEventListener("change", async (e) => {
  const products = await appState.loadProducts();
  const selectedCategory = e.target.value;
  appView.onCategoryFilterChange(products, selectedCategory);
});

/* Submit user message handler */
appView.chatView.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userMessage = await appView.chatView.submitUserMessage();
  this.appState.addUserMessage(userMessage);
  await handleAIRequest();
});

/* Submit routine handler */
appView.submitRoutineList.addEventListener("click", async (e) => {
  e.preventDefault();

  // Message history will not be relevant to new routine, so reset it
  appState.resetMessageHistory();
  appView.chatView.clearAllMessages();

  appView.submitRoutineList.disabled = true;
  appView.appendRoutineMessage();
  appState.submitRoutineProducts();
  await appView.handleAIRequest();
  appView.submitRoutineList.disabled = false;
});
