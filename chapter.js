// firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// get info from url
var urlParams = new URLSearchParams(window.location.search);
var bookId = urlParams.get("bookid");
var chapterIndex = parseInt(urlParams.get("chapter")) || 0;
var bookTitle = urlParams.get("booktitle") ? decodeURIComponent(urlParams.get("booktitle")) : "Book";

// chapters array loaded from localStorage
var chapters = [];
var currentUser = null;

// watch login state
onAuthStateChanged(auth, function(user) {
  currentUser = user;
});

// load chapters from localStorage and show current chapter
function loadChapter() {
  // get chapters saved by read.js
  var saved = localStorage.getItem("booklink_chapters_" + bookId);
  if (!saved) {
    document.getElementById("chapter-text").innerHTML = "<p style='color:#95a5a6;'>Could not load chapter. <a href='index.html' style='color:#ff3e3e;'>Go home</a></p>";
    return;
  }

  chapters = JSON.parse(saved);

  if (chapterIndex >= chapters.length || chapterIndex < 0) {
    document.getElementById("chapter-text").innerHTML = "<p style='color:#95a5a6;'>Chapter not found.</p>";
    return;
  }

  var chapter = chapters[chapterIndex];
  var chapterTitle = chapter.title || ("Chapter " + (chapterIndex + 1));

  // update breadcrumb
  var bookCrumb = document.getElementById("chapter-book-title-crumb");
  var chCrumb = document.getElementById("chapter-title-crumb");
  if (bookCrumb) bookCrumb.innerText = bookTitle;
  if (chCrumb) chCrumb.innerText = chapterTitle;

  // update chapter title in nav
  var titleDisplay = document.getElementById("chapter-title-display");
  if (titleDisplay) titleDisplay.innerText = chapterTitle;

  // update page title
  document.title = "BookLink | " + bookTitle + " - " + chapterTitle;

  // show chapter text
  // split text into paragraphs by line breaks
  var textContainer = document.getElementById("chapter-text");
  if (textContainer) {
    var lines = chapter.text.split("\n");
    var html = "";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.length > 0) {
        html += "<p>" + line + "</p>";
      }
    }
    textContainer.innerHTML = html || "<p>" + chapter.text + "</p>";
  }

  // update prev/next buttons
  updateNavButtons();

  // update back to book link
  var backBtn = document.getElementById("back-to-book-btn");
  if (backBtn) {
    backBtn.href = "read.html?id=" + bookId + "&title=" + encodeURIComponent(bookTitle);
  }

  // save to reading history
  var hist = JSON.parse(localStorage.getItem("booklink_history")) || [];
  if (!hist.includes(bookTitle)) {
    hist.unshift(bookTitle);
    if (hist.length > 20) hist.pop();
    localStorage.setItem("booklink_history", JSON.stringify(hist));
  }

  // load comments for this chapter
  loadComments();
}

// update the previous and next buttons
function updateNavButtons() {
  var prevBtn = document.getElementById("prev-chapter-btn");
  var prevBtn2 = document.getElementById("prev-chapter-btn2");
  var nextBtn = document.getElementById("next-chapter-btn");
  var nextBtn2 = document.getElementById("next-chapter-btn2");

  // disable prev button on first chapter
  if (prevBtn) prevBtn.disabled = (chapterIndex === 0);
  if (prevBtn2) prevBtn2.disabled = (chapterIndex === 0);

  // disable next button on last chapter
  if (nextBtn) nextBtn.disabled = (chapterIndex >= chapters.length - 1);
  if (nextBtn2) nextBtn2.disabled = (chapterIndex >= chapters.length - 1);
}

// go to previous chapter
function goToPrevChapter() {
  if (chapterIndex > 0) {
    window.location.href = "chapter.html?bookid=" + bookId + "&chapter=" + (chapterIndex - 1) + "&booktitle=" + encodeURIComponent(bookTitle);
  }
}

// go to next chapter
function goToNextChapter() {
  if (chapterIndex < chapters.length - 1) {
    window.location.href = "chapter.html?bookid=" + bookId + "&chapter=" + (chapterIndex + 1) + "&booktitle=" + encodeURIComponent(bookTitle);
  }
}

// load comments for this specific chapter from firebase firestore
async function loadComments() {
  var commentsList = document.getElementById("comments-list");
  if (!commentsList) return;

  commentsList.innerHTML = "Loading comments...";

  try {
    // comments are stored by bookid and chapter number so each chapter has its own comments
    var commentsRef = collection(db, "comments_" + bookId + "_ch" + chapterIndex);
    var q = query(commentsRef, orderBy("time", "desc"));
    var snapshot = await getDocs(q);

    if (snapshot.empty) {
      commentsList.innerHTML = "<p class='no-comments'>No comments yet. Be the first to comment!</p>";
      return;
    }

    var html = "";
    snapshot.forEach(function(doc) {
      var data = doc.data();
      var timeText = "";
      if (data.time && data.time.toDate) {
        var d = data.time.toDate();
        timeText = d.toLocaleDateString() + " " + d.toLocaleTimeString();
      }

      html += '<div class="comment-card">';
      html += '<div class="comment-user"><i class="fas fa-user"></i> ' + (data.username || "Anonymous") + '</div>';
      html += '<div class="comment-text">' + data.text + '</div>';
      html += '<div class="comment-time">' + timeText + '</div>';
      html += '</div>';
    });

    commentsList.innerHTML = html;

  } catch (err) {
    console.error(err);
    commentsList.innerHTML = "<p class='no-comments'>Could not load comments.</p>";
  }
}

// post a new comment to firebase
async function postComment() {
  var commentInput = document.getElementById("comment-input");
  if (!commentInput) return;

  var commentText = commentInput.value.trim();

  if (!commentText) {
    alert("Please write something before posting.");
    return;
  }

  if (!currentUser) {
    alert("Please login first to post a comment.");
    return;
  }

  try {
    var commentsRef = collection(db, "comments_" + bookId + "_ch" + chapterIndex);
    await addDoc(commentsRef, {
      text: commentText,
      username: currentUser.email,
      userid: currentUser.uid,
      time: serverTimestamp()
    });

    // clear the input
    commentInput.value = "";

    // reload comments to show the new one
    loadComments();

  } catch (err) {
    console.error(err);
    alert("Failed to post comment. Please try again.");
  }
}

// make navigation functions available globally for html onclick
window.goToPrevChapter = goToPrevChapter;
window.goToNextChapter = goToNextChapter;

// post comment button
var postBtn = document.getElementById("post-comment-btn");
if (postBtn) {
  postBtn.addEventListener("click", postComment);
}

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
      var q = searchBox.value.trim();
      if (q) window.location.href = "index.html?search=" + encodeURIComponent(q);
    }
  });
}

// load chapter when page opens
loadChapter();