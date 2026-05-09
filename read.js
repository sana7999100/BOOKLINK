// firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// firebase setup
var firebaseConfig = {
  apiKey: "AIzaSyA3IoxFFqgbHGwfe_mS_UXkZA0GmQfrL_o",
  authDomain: "synclink-11d54.firebaseapp.com",
  projectId: "synclink-11d54",
  storageBucket: "synclink-11d54.firebasestorage.app",
  messagingSenderId: "304027366809",
  appId: "1:304027366789:web:f817b677b157e4274d8f08",
  measurementId: "G-RYLTVTC73P"
};

var app = initializeApp(firebaseConfig);
var auth = getAuth(app);

// get book id and title from url
var urlParams = new URLSearchParams(window.location.search);
var bookId = urlParams.get("id");
var bookTitle = urlParams.get("title") ? decodeURIComponent(urlParams.get("title")) : "Book";

// update breadcrumb
var breadcrumb = document.getElementById("book-breadcrumb");
if (breadcrumb) breadcrumb.innerText = bookTitle;

// update page title
document.title = "BookLink | " + bookTitle;

// load book info from gutenberg
async function loadBookInfo() {
  if (!bookId) {
    document.getElementById("book-info").innerHTML = "<p style='padding:20px; color:#95a5a6;'>No book selected. <a href='index.html' style='color:#ff3e3e;'>Go back home</a></p>";
    return;
  }

  try {
    var res = await fetch("https://gutendex.com/books/" + bookId);
    var book = await res.json();

    // set title
    var titleEl = document.getElementById("book-title-big");
    if (titleEl) titleEl.innerText = book.title || bookTitle;

    // set author
    var authorEl = document.getElementById("book-author");
    if (authorEl) {
      var authorName = "Unknown Author";
      if (book.authors && book.authors.length > 0) {
        authorName = book.authors[0].name;
      }
      authorEl.innerHTML = '<i class="fas fa-user"></i> ' + authorName;
    }

    // set genres/subjects
    var subjectsEl = document.getElementById("book-subjects");
    if (subjectsEl && book.subjects && book.subjects.length > 0) {
      subjectsEl.innerHTML = '<i class="fas fa-tag"></i> ' + book.subjects.slice(0, 3).join(", ");
    }

    // set description
    var descEl = document.getElementById("book-description");
    if (descEl) {
      descEl.innerText = "A free public domain book from Project Gutenberg. Click a chapter below to start reading for free.";
    }

    // set cover image
    var coverImg = document.getElementById("book-cover-img");
    if (coverImg) {
      if (book.formats && book.formats["image/jpeg"]) {
        coverImg.src = book.formats["image/jpeg"];
      } else {
        coverImg.src = "https://via.placeholder.com/140x200/0a1724/ff3e3e?text=Book";
      }
      coverImg.onerror = function() {
        this.src = "https://via.placeholder.com/140x200/0a1724/ff3e3e?text=Book";
      };
    }

    // now load chapters
    loadChapters(book);

  } catch (err) {
    console.error(err);
    document.getElementById("book-info").innerHTML = "<p style='padding:20px; color:#95a5a6;'>Could not load book. <a href='index.html' style='color:#ff3e3e;'>Go back home</a></p>";
  }
}

// load the full text and split into chapters
async function loadChapters(book) {
  var chaptersContainer = document.getElementById("chapters-list");
  if (!chaptersContainer) return;

  chaptersContainer.innerHTML = "Loading chapters... this may take a moment.";

  // find plain text url from gutenberg formats
  var textUrl = "";
  if (book.formats) {
    if (book.formats["text/plain; charset=utf-8"]) {
      textUrl = book.formats["text/plain; charset=utf-8"];
    } else if (book.formats["text/plain; charset=us-ascii"]) {
      textUrl = book.formats["text/plain; charset=us-ascii"];
    } else if (book.formats["text/plain"]) {
      textUrl = book.formats["text/plain"];
    }
  }

  if (!textUrl) {
    chaptersContainer.innerHTML = "<p style='color:#95a5a6; padding:10px;'>No readable text found for this book. Please try another one.</p>";
    return;
  }

  try {
    var res = await fetch(textUrl);
    var fullText = await res.text();

    // split the book into chapters
    var chapters = splitIntoChapters(fullText);

    if (chapters.length === 0) {
      chaptersContainer.innerHTML = "<p style='color:#95a5a6; padding:10px;'>Could not find chapters in this book.</p>";
      return;
    }

    // save chapters to localStorage so chapter.js can read them
    // we store by book id so multiple books dont mix up
    localStorage.setItem("booklink_chapters_" + bookId, JSON.stringify(chapters));
    localStorage.setItem("booklink_book_title_" + bookId, book.title || bookTitle);

    // build chapter list html
    var html = "";
    for (var i = 0; i < chapters.length; i++) {
      var chName = chapters[i].title || ("Chapter " + (i + 1));
      html += '<a class="chapter-item" href="chapter.html?bookid=' + bookId + '&chapter=' + i + '&booktitle=' + encodeURIComponent(book.title || bookTitle) + '">';
      html += '<span>' + chName + '</span>';
      html += '<i class="fas fa-chevron-right"></i>';
      html += '</a>';
    }

    chaptersContainer.innerHTML = html;

    // set start reading button to first chapter
    var startBtn = document.getElementById("start-reading-btn");
    if (startBtn) {
      startBtn.href = "chapter.html?bookid=" + bookId + "&chapter=0&booktitle=" + encodeURIComponent(book.title || bookTitle);
    }

  } catch (err) {
    console.error(err);
    chaptersContainer.innerHTML = "<p style='color:#95a5a6; padding:10px;'>Error loading book text. Please try another book.</p>";
  }
}

// split full book text into chapters
function splitIntoChapters(text) {
  var chapters = [];

  // remove gutenberg header and footer boilerplate
  var startMarker = text.indexOf("*** START OF");
  if (startMarker !== -1) {
    text = text.substring(startMarker + 60);
  }
  var endMarker = text.indexOf("*** END OF");
  if (endMarker !== -1) {
    text = text.substring(0, endMarker);
  }

  // look for chapter headings like CHAPTER I, CHAPTER 1, Chapter One etc
  var chapterRegex = /\n\s*(CHAPTER\s+[IVXLCDM\d]+[^\n]*|Chapter\s+[IVXLCDM\d]+[^\n]*)\s*\n/g;
  var matches = [];
  var match;

  while ((match = chapterRegex.exec(text)) !== null) {
    matches.push({ title: match[1].trim(), index: match.index });
  }

  if (matches.length > 1) {
    // found chapters, split by them
    for (var i = 0; i < matches.length; i++) {
      var start = matches[i].index;
      var end = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      var chapterText = text.substring(start, end).trim();

      if (chapterText.length > 200) {
        chapters.push({ title: matches[i].title, text: chapterText });
      }
    }
  } else {
    // no chapters found, split by every 2500 words
    var words = text.split(/\s+/);
    var chunkSize = 2500;
    var partNum = 1;

    for (var i = 0; i < words.length; i += chunkSize) {
      var chunk = words.slice(i, i + chunkSize).join(" ").trim();
      if (chunk.length > 100) {
        chapters.push({ title: "Part " + partNum, text: chunk });
        partNum++;
      }
    }
  }

  return chapters;
}

// bookmark this book
function bookmarkThisBook() {
  var bookmarks = JSON.parse(localStorage.getItem("booklink_bookmarks")) || [];
  if (!bookmarks.includes(bookTitle)) {
    bookmarks.push(bookTitle);
    localStorage.setItem("booklink_bookmarks", JSON.stringify(bookmarks));
    alert("Bookmarked: " + bookTitle);
  } else {
    alert("Already in your bookmarks!");
  }
}

window.bookmarkThisBook = bookmarkThisBook;

// search on this page goes back to index
var searchBtn = document.getElementById("search-btn");
if (searchBtn) {
  searchBtn.addEventListener("click", function() {
    var query = document.getElementById("search-box").value.trim();
    if (query) window.location.href = "index.html?search=" + encodeURIComponent(query);
  });
}

var searchBox = document.getElementById("search-box");
if (searchBox) {
  searchBox.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      var query = searchBox.value.trim();
      if (query) window.location.href = "index.html?search=" + encodeURIComponent(query);
    }
  });
}

// load everything when page opens
loadBookInfo();