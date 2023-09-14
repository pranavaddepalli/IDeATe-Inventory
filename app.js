// app.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const port = 3000;
const iorefURL = 'http://127.0.0.1:8055';
const accessToken = '_dtEPdhNFAh1BuISj341frrfAYa-7hMt';
const app = express();

let lastchangedpartnum = "";
let lastchangedfield = "";
let lastchangedvalue = "";
let lastchangeddate = "";

// format date as YYYY-MM-DD hh:mm:ss
const dateformat = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    const seconds = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


// Set the views directory and view engine
app.set('views', './views');
app.set('view engine', 'ejs');

// Parse JSON bodies
app.use(bodyParser.json());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/api/partdetails', (req, res) => {
  const partNumber  = req.query.partNumber;
  axios.get(`${iorefURL}/items/parts/?filter[part_num][_eq]=${partNumber}&access_token=${accessToken}`)
.then(response => {
  res.send(response.data.data[0]);
}).catch(error => {
  console.error('Error retrieving part:', error);
  // Render an error page or display an error message
  res.render('error', { error });
});
});

app.get('/parts', (req, res) => {
  const partNumber = req.query.partNumber;

  if (!/^\d+$/.test(partNumber)) {
    axios.get(`${iorefURL}/items/parts/?access_token=${accessToken}&limit=-1`)
    .then(response => {
      const parts = response.data.data;
      if (parts.length === 0) {
        res.render('error', { error: 'No parts!' });
      }
      res.render('allparts.ejs', { parts });
    })
    .catch(error => {
      console.error('Error retrieving parts:', error);
      // Render an error page or display an error message
      res.render('error', { error });
    });
  }

  else{
  axios.get(`${iorefURL}/items/parts/?filter[part_num][_eq]=${partNumber}&access_token=${accessToken}`)
    .then(response => {
      const parts = response.data.data;
      if (parts.length === 0) {
        res.render('error', { error: 'Part not found.' });
      }
      const part = parts[0];

      let latest_inventory = "No inventory history";
      let latest_backstock = "No backstock history";
      let latest_price = "No price history";
      let latest_supplier = "No supplier history";
      let latest_purchaselink = "No purchase link";
      
      let chartprice_dates = [];
      let price_values = [];
      let chartinventory_dates = [];
      let inventory_values = [];
      let chartbackstock_dates = [];
      let backstock_values = [];

      if (part.inventory_history !== null){
        const inventory_history = (part.inventory_history);
        const inventory_dates = Object.keys(inventory_history);
        inventory_dates.sort((a, b) => new Date(a) - new Date(b));

        const inventoryHistoryArray = Object.entries(inventory_history);
        inventoryHistoryArray.sort((a, b) => new Date(a[0]) - new Date(b[0])).reverse();
        const sortedInventoryHistory = Object.fromEntries(inventoryHistoryArray);
        chartinventory_dates = Object.keys(sortedInventoryHistory).map(dateString => new Date(dateString));
        inventory_values = Object.values(sortedInventoryHistory);

        latest_inventory = inventory_history[inventory_dates[inventory_dates.length - 1]] + " " + part.unit + " as of " + inventory_dates[inventory_dates.length - 1];
      }
      if (part.backstock_history !== null){
      const backstock_history = (part.backstock_history);
      const backstock_dates = Object.keys(backstock_history);
        backstock_dates.sort((a, b) => new Date(a) - new Date(b));

        const backstockHistoryArray = Object.entries(backstock_history);
        backstockHistoryArray.sort((a, b) => new Date(a[0]) - new Date(b[0])).reverse();
        const sortedBackstockHistory = Object.fromEntries(backstockHistoryArray);
        chartbackstock_dates = Object.keys(sortedBackstockHistory).map(dateString => new Date(dateString));
        backstock_values = Object.values(sortedBackstockHistory);

      latest_backstock = backstock_history[backstock_dates[backstock_dates.length - 1]] + " " + part.unit + " as of " + backstock_dates[backstock_dates.length - 1];
      }
        if (part.price_history !== null){
        const price_history = (part.price_history);
        const price_dates = Object.keys(price_history);
        price_dates.sort((a, b) => new Date(a) - new Date(b));

        const priceHistoryArray = Object.entries(price_history);
        priceHistoryArray.sort((a, b) => new Date(a[0]) - new Date(b[0])).reverse();
        const sortedPriceHistory = Object.fromEntries(priceHistoryArray);
        chartprice_dates = Object.keys(sortedPriceHistory).map(dateString => new Date(dateString));
        price_values = Object.values(sortedPriceHistory);
        
        latest_price = "$" + price_history[price_dates[price_dates.length - 1]] + " per " + part.unit + " as of " + price_dates[price_dates.length - 1];
        }
        if (part.supplier_history !== null){
          const supplier_history = (part.supplier_history);
          const supplier_dates = Object.keys(supplier_history);
          supplier_dates.sort((a, b) => new Date(a) - new Date(b));
          latest_supplier = supplier_history[supplier_dates[supplier_dates.length - 1]];
        }
        if (part.purchase_link_history !== null){
            const purchase_link_history = (part.purchase_link_history);
            const purchase_link_dates = Object.keys(purchase_link_history);
            purchase_link_dates.sort((a, b) => new Date(a) - new Date(b));
            latest_purchaselink = purchase_link_history[purchase_link_dates[purchase_link_dates.length - 1]];
        }

        let lastchangedstring = ""
        
        if (lastchangedpartnum == part.part_num) {
          lastchangedstring = "Last changed " + lastchangedfield + " to " + lastchangedvalue + " on " + lastchangeddate;
        }

        const minquantity = part.min_quantity;
        const maxquantity = part.max_quantity;

      res.render('part', { part, latest_inventory, latest_backstock, latest_price, latest_supplier, latest_purchaselink, lastchangedstring, chartprice_dates, price_values, chartinventory_dates, inventory_values, chartbackstock_dates, backstock_values, minquantity, maxquantity });
    })
    .catch(error => {
      console.error('Error retrieving parts:', error);
      // Render an error page or display an error message
      res.render('error', { error });
    });
}
});

  app.post('/updateinventory', (req, res) => {
    let { part_num, directus_id, newInventory } = req.body;

    const today = dateformat(new Date());
    
    axios.get(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`)
    .then(response => {
      const part = response.data.data;
    if(part.inventory_history !== null){
        oldInventory = JSON.parse(JSON.stringify(part.inventory_history));
    }
    else {
        oldInventory = {};
    }
    oldInventory[today] = newInventory;
    // sort the oldinventory by date, with the most recent at the beginning
    const inventoryHistoryArray = Object.entries(oldInventory);
    inventoryHistoryArray.sort((a, b) => new Date(a[0]) - new Date(b[0])).reverse();
    const sortedInventoryHistory = Object.fromEntries(inventoryHistoryArray);
    // convert the sorted inventory history back to a string
    const updatedInventoryString = JSON.stringify(sortedInventoryHistory);

    
    axios
    .patch(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`, {
        inventory_history: updatedInventoryString,
        current_inventory: newInventory
    })
    .then(response => {
        lastchangedfield = "inventory";
        lastchangedvalue = newInventory;
        lastchangeddate = today;
        lastchangedpartnum = part_num;

      console.log('Inventory updated successfully:', response.data);
      res.redirect(`/parts?partNumber=${part_num}`);
    })
    .catch(error => {
      res.render('error', { error });
    });
  });  
});


  app.post('/updatebackstock', (req, res) => {
    let { part_num, directus_id, newBackstock } = req.body;

    const today = dateformat(new Date());
    
    axios.get(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`)
    .then(response => {
      const part = response.data.data;
    if(part.backstock_history !== null){
        oldBackstock = JSON.parse(JSON.stringify(part.backstock_history));
    }
    else {
        oldBackstock = {};
    }
    oldBackstock[today] = newBackstock;
    // sort by date, with the most recent at the beginning
    const backstockHistoryArray = Object.entries(oldBackstock);
    backstockHistoryArray.sort((a, b) => new Date(a[0]) - new Date(b[0])).reverse();
    const sortedBackstockHistory = Object.fromEntries(backstockHistoryArray);
    // convert the sorted backstock history back to a string
    const updatedBackstockString = JSON.stringify(sortedBackstockHistory);
    
    axios
    .patch(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`, {
        backstock_history: updatedBackstockString,
        current_backstock: newBackstock
    })
    .then(response => {
        lastchangedfield = "backstock";
        lastchangedvalue = newBackstock;
        lastchangeddate = today;
        lastchangedpartnum = part_num;
      console.log('Backstock updated successfully:', response.data);
      res.redirect(`/parts?partNumber=${part_num}`);
    })
    .catch(error => {
      res.render('error', { error });
    });
  });  

  });

  app.post('/updatepricesupplierpurchaselink', (req, res) => {
    let { part_num, directus_id, newPrice, newSupplier, newPurchaseLink } = req.body;

    const today = dateformat(new Date());

      axios.get(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`)
      .then(response => {
        const part = response.data.data;
      if(part.price_history !== null){
          oldPrice = JSON.parse(JSON.stringify(part.price_history));
      }
      else {
          oldPrice = {};
      }
      if(part.supplier_history !== null){
        oldSupplier = JSON.parse(JSON.stringify(part.supplier_history));
    }
    else {
        oldSupplier = {};
    }
    if(part.purchase_link_history !== null){
      oldPurchaseLink = JSON.parse(JSON.stringify(part.purchase_link_history));
  }
  else {
      oldPurchaseLink = {};
  }

    if (newPrice != ""){
    oldPrice[today] = newPrice;
    }
    if (newSupplier != ""){
    oldSupplier[today] = newSupplier;
    }
    if (newPurchaseLink != ""){
    oldPurchaseLink[today] = newPurchaseLink;
    }

    // sort by date, with the most recent at the beginning
    const supplierHistoryArray = Object.entries(oldSupplier);
    supplierHistoryArray.sort((a, b) => new Date(b[0]) - new Date(a[0])).reverse();
    const sortedSupplierHistory = Object.fromEntries(supplierHistoryArray);
    // convert the sorted supplier history back to a string
    const updatedSupplierString = JSON.stringify(sortedSupplierHistory);
      // sort by date, with the most recent at the beginning
      const priceHistoryArray = Object.entries(oldPrice);
      priceHistoryArray.sort((a, b) => new Date(b[0]) - new Date(a[0])).reverse();
      const sortedPriceHistory = Object.fromEntries(priceHistoryArray);
      // convert the sorted price history back to a string
      const updatedPriceString = JSON.stringify(sortedPriceHistory);

    // sort by date, with the most recent at the beginning
    const purchaseLinkHistoryArray = Object.entries(oldPurchaseLink);
    purchaseLinkHistoryArray.sort((a, b) => new Date(b[0]) - new Date(a[0])).reverse();
    const sortedPurchaseLinkHistory = Object.fromEntries(purchaseLinkHistoryArray);
    // convert the sorted purchase link history back to a string
    const updatedPurchaseLinkString = JSON.stringify(sortedPurchaseLinkHistory);
  
      axios
      .patch(`${iorefURL}/items/parts/${directus_id}?access_token=${accessToken}`, {
          price_history: updatedPriceString,
          supplier_history: updatedSupplierString,
          purchase_link_history: updatedPurchaseLinkString,
          current_price: newPrice,
          current_supplier: newSupplier,
          current_purchase_link: newPurchaseLink


      })
      .then(response => {
          lastchangedfield = "Price / Supplier / Purchase Link";
          lastchangedvalue = newPrice + " / " + newSupplier + " / " + newPurchaseLink;
          lastchangeddate = today;
          lastchangedpartnum = part_num;
        console.log('Price updated successfully:', response.data);
        console.log('Supplier updated successfully:', response.data);
        console.log('Purchase Link updated successfully:', response.data);

        res.redirect(`/parts?partNumber=${part_num}`);

      })
      .catch(error => {
        res.render('error', { error });
      });
    });  
  });


app.listen(port, () => {
  console.log('Server started on port 3000');
});
