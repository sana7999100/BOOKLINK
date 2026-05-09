// firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// firebase setup
var firebaseConfig = {
  apiKey: "AIzaSyA3IoxFFqgbHGwfe_mS_UXkZA0GmQfrL_o",
  authDomain: "synclink-11d54.firebaseapp.com",
  projectId: "synclink-11d54",
  storageBucket: "synclink-11d54.firebasestorage.app",
  messagingSenderId: "304027366809",
  appId: "1:304027366809:web:f817b677b157e4274d8f08",
  measurementId: "G-RYLTVTC73P"
};

var app = initializeApp(firebaseConfig);
var auth = getAuth(app);
var db = getFirestore(app);

// gutenberg api - these are free public domain books

var FEATURED_URL = "https://gutendex.com/books/?topic=fiction&languages=en";
var TRENDING_URL = "https://gutendex.com/books/?topic=adventure&languages=en";
var TOPWEEK_URL = "https://gutendex.com/books/?topic=mystery&languages=en";

// this function fetches books from gutenberg and shows them in a slider
async function fetchBooks(url, containerId) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "Loading books...";

  try {
    var res = await fetch(url);
    var data = await res.json();
    var books = data.results || [];

    if (books.length === 0) {
      container.innerHTML = "No books found.";
      return;
    }

    var html = "";
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      var title = book.title || "No Title";
      var bookId = book.id;

      // get cover image from gutenberg
      var imgUrl = "";
      if (book.formats && book.formats["image/jpeg"]) {
        imgUrl = book.formats["image/jpeg"];
      } else {
        imgUrl = "https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book";
      }

      // encode title so apostrophes dont break onclick
      var safeTitle = encodeURIComponent(title);

      html += '<div class="novel-card" onclick="openBook(' + bookId + ', decodeURIComponent(\'' + safeTitle + '\'))">';
      html += '<img src="' + imgUrl + '" alt="' + title + '" onerror="this.src=\'https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book\'">';
      html += '<p>' + title + '</p>';
      html += '<button onclick="event.stopPropagation(); saveBookmark(decodeURIComponent(\'' + safeTitle + '\'))">Bookmark</button>';
      html += '</div>';
    }

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = "Error loading books. Please refresh.";
    console.error(err);
  }
}

// when user clicks a book it goes to read.html with the book id
function openBook(bookId, title) {
  // save to history first
  saveHistory(title);
  // go to read page
  window.location.href = "read.html?id=" + bookId + "&title=" + encodeURIComponent(title);
}

// save book title to reading history in localStorage
function saveHistory(title) {
  var hist = JSON.parse(localStorage.getItem("booklink_history")) || [];
  if (!hist.includes(title)) {
    hist.unshift(title); // add to beginning of list
    if (hist.length > 20) hist.pop(); // keep max 20 items
    localStorage.setItem("booklink_history", JSON.stringify(hist));
  }
  showHistory();
}

// save book to bookmarks
function saveBookmark(title) {
  var bookmarks = JSON.parse(localStorage.getItem("booklink_bookmarks")) || [];
  if (!bookmarks.includes(title)) {
    bookmarks.push(title);
    localStorage.setItem("booklink_bookmarks", JSON.stringify(bookmarks));
    alert("Bookmarked: " + title);
  } else {
    alert("Already bookmarked!");
  }
}

// show reading history on main page
function showHistory() {
  var hist = JSON.parse(localStorage.getItem("booklink_history")) || [];
  var container = document.getElementById("history-list");
  if (!container) return;

  if (hist.length === 0) {
    container.innerHTML = "<p style='padding:0 20px; color:#95a5a6; font-size:13px;'>No history yet. Start reading a book!</p>";
  } else {
    var html = "";
    for (var i = 0; i < hist.length; i++) {
      html += "<p style='padding:6px 20px; font-size:13px; color:#ccc; border-bottom:1px solid #1e2d3d;'>• " + hist[i] + "</p>";
    }
    container.innerHTML = html;
  }
}

// search books using gutendex api
async function searchBooks() {
  var query = document.getElementById("search-box").value.trim();
  if (!query) return;

  var searchSection = document.getElementById("search-section");
  var searchResults = document.getElementById("search-results");
  if (!searchResults) return;

  if (searchSection) searchSection.style.display = "block";
  searchResults.innerHTML = "Searching for: " + query + "...";

  try {
    var res = await fetch("https://gutendex.com/books/?search=" + encodeURIComponent(query));
    var data = await res.json();
    var books = data.results || [];

    if (books.length === 0) {
      searchResults.innerHTML = "<p style='padding:10px; color:#95a5a6;'>No results found for: " + query + "</p>";
      return;
    }

    var html = "";
    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      var title = book.title || "No Title";
      var bookId = book.id;

      var imgUrl = "";
      if (book.formats && book.formats["image/jpeg"]) {
        imgUrl = book.formats["image/jpeg"];
      } else {
        imgUrl = "https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book";
      }

      var safeTitle = encodeURIComponent(title);

      html += '<div class="novel-card" onclick="openBook(' + bookId + ', decodeURIComponent(\'' + safeTitle + '\'))">';
      html += '<img src="' + imgUrl + '" alt="' + title + '" onerror="this.src=\'https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book\'">';
      html += '<p>' + title + '</p>';
      html += '<button onclick="event.stopPropagation(); saveBookmark(decodeURIComponent(\'' + safeTitle + '\'))">Bookmark</button>';
      html += '</div>';
    }

    searchResults.innerHTML = html;

  } catch (err) {
    searchResults.innerHTML = "Search failed. Please try again.";
    console.error(err);
  }
}

// profile page menu function
function showData(type) {
  var content = document.getElementById("view-content");
  var title = document.getElementById("view-title");
  if (!content || !title) return;

  // update active button
  var buttons = document.querySelectorAll(".menu-item");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("active");
  }
  if (event && event.target) {
    event.target.classList.add("active");
  }

  if (type === "profile") {
    title.innerText = "PROFILE";
    var user = auth.currentUser;
    if (user) {
      content.innerHTML = "<p>Email: " + user.email + "</p><p>User ID: " + user.uid + "</p>";
    } else {
      content.innerHTML = "<p>You are not logged in. Please login from the main page.</p>";
    }

  } else if (type === "bookmarks") {
    title.innerText = "YOUR BOOKMARKS";
    var bookmarks = JSON.parse(localStorage.getItem("booklink_bookmarks")) || [];
    if (bookmarks.length === 0) {
      content.innerHTML = "<p>No bookmarks yet.</p>";
    } else {
      var html = "";
      for (var i = 0; i < bookmarks.length; i++) {
        html += "<p>⭐ " + bookmarks[i] + "</p>";
      }
      content.innerHTML = html;
    }

  } else if (type === "novels") {
    title.innerText = "BOOK LIST";
    content.innerHTML = "<p>Loading books...</p>";
    // show books inside profile content
    fetch("https://gutendex.com/books/?topic=fiction&languages=en")
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var books = data.results || [];
        var html = '<div class="slider" style="flex-wrap:wrap;">';
        for (var i = 0; i < books.length; i++) {
          var book = books[i];
          var safeTitle = encodeURIComponent(book.title || "No Title");
          var imgUrl = (book.formats && book.formats["image/jpeg"]) ? book.formats["image/jpeg"] : "https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book";
          html += '<div class="novel-card" onclick="openBook(' + book.id + ', decodeURIComponent(\'' + safeTitle + '\'))">';
          html += '<img src="' + imgUrl + '" onerror="this.src=\'https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book\'">';
          html += '<p>' + book.title + '</p></div>';
        }
        html += '</div>';
        content.innerHTML = html;
      })
      .catch(function() {
        content.innerHTML = "<p>Could not load books.</p>";
      });

  } else if (type === "history") {
    title.innerText = "READING HISTORY";
    var hist = JSON.parse(localStorage.getItem("booklink_history")) || [];
    if (hist.length === 0) {
      content.innerHTML = "<p>No history found.</p>";
    } else {
      var html = "";
      for (var i = 0; i < hist.length; i++) {
        html += "<p>• " + hist[i] + "</p>";
      }
      content.innerHTML = html;
    }

  } else if (type === "notifications") {
    title.innerText = "NOTIFICATIONS";
    content.innerHTML = "<p>No new notifications.</p>";

  } else if (type === "genre") {
    title.innerText = "DARK GENRE";
    content.innerHTML = "<p>Loading dark genre books...</p>";
    fetch("https://gutendex.com/books/?topic=horror&languages=en")
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var books = data.results || [];
        var html = '<div class="slider">';
        for (var i = 0; i < books.length; i++) {
          var book = books[i];
          var safeTitle = encodeURIComponent(book.title || "No Title");
          var imgUrl = (book.formats && book.formats["image/jpeg"]) ? book.formats["image/jpeg"] : "https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book";
          html += '<div class="novel-card" onclick="openBook(' + book.id + ', decodeURIComponent(\'' + safeTitle + '\'))">';
          html += '<img src="' + imgUrl + '" onerror="this.src=\'https://via.placeholder.com/130x180/0a1724/ff3e3e?text=Book\'">';
          html += '<p>' + book.title + '</p></div>';
        }
        html += '</div>';
        content.innerHTML = html;
      })
      .catch(function() {
        content.innerHTML = "<p>Could not load books.</p>";
      });

  } else if (type === "comments") {
    title.innerText = "MY COMMENTS";
    content.innerHTML = "<p>No comments yet. Start reading and comment on chapters!</p>";

  } else if (type === "reviews") {
    title.innerText = "MY REVIEWS";
    content.innerHTML = "<p>No reviews yet.</p>";
  }
}

// make functions available globally for html onclick to use
window.showData = showData;
window.openBook = openBook;
window.saveBookmark = saveBookmark;

// sign up button
var signupBtn = document.getElementById("signup-btn");
if (signupBtn) {
  signupBtn.addEventListener("click", function() {
    var email = document.getElementById("signup-email").value.trim();
    var password = document.getElementById("signup-password").value.trim();

    if (!email || !password) {
      alert("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(function(userCredential) {
        alert("Account created for " + userCredential.user.email);
      })
      .catch(function(err) {
        alert("Sign up failed: " + err.message);
      });
  });
}

// login button
var loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", function() {
    var email = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      alert("Please fill in both email and password.");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(function(userCredential) {
        alert("Logged in as " + userCredential.user.email);
      })
      .catch(function(err) {
        alert("Login failed: " + err.message);
      });
  });
}

// logout button
var logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function() {
    signOut(auth)
      .then(function() {
        alert("You have been logged out.");
      })
      .catch(function(err) {
        console.error(err);
      });
  });
}

// watch login state and update status text
var statusEl = document.getElementById("user-status");
if (statusEl) {
  onAuthStateChanged(auth, function(user) {
    if (user) {
      statusEl.innerText = "Logged in as " + user.email;
    } else {
      statusEl.innerText = "Not logged in";
    }
  });
}

// notification count
var notifEl = document.getElementById("notif-count");
if (notifEl) notifEl.innerText = "";

// search button
var searchBtn = document.getElementById("search-btn");
if (searchBtn) {
  searchBtn.addEventListener("click", searchBooks);
}

// also search on enter key
var searchBox = document.getElementById("search-box");
if (searchBox) {
  searchBox.addEventListener("keypress", function(e) {
    if (e.key === "Enter") searchBooks();
  });
}

// trending tab
var trendingBtn = document.getElementById("trending-btn");
if (trendingBtn) {
  trendingBtn.addEventListener("click", function() {
    document.getElementById("trending-btn").classList.add("active");
    document.getElementById("topweek-btn").classList.remove("active");
    fetchBooks(TRENDING_URL, "ranking-list");
  });
}

// top week tab
var topWeekBtn = document.getElementById("topweek-btn");
if (topWeekBtn) {
  topWeekBtn.addEventListener("click", function() {
    document.getElementById("topweek-btn").classList.add("active");
    document.getElementById("trending-btn").classList.remove("active");
    fetchBooks(TOPWEEK_URL, "ranking-list");
  });
}

// load everything when page opens
fetchBooks(FEATURED_URL, "novel-slider");
fetchBooks(TRENDING_URL, "ranking-list");
showHistory();
