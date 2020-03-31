$(async function() {
  // cache some selectors we'll be using quite a bit
  const $body = $("body");
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $userProfile = $("#user-profile");
  const $navUserProfile = $("#nav-user-profile");
  const $ownStories = $("#my-articles");
  const $favoritedStories = $("#favorited-articles");
  const $navWelcome = $("#nav-welcome");
  const $error = $("#error");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    try {
      // call the login static method to build a user instance
      const userInstance = await User.login(username, password);
      // set the global user to the user instance
      currentUser = userInstance;

      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (e) {
      handleError(e);
    }
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    try {
      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    } catch (e) {
      handleError(e);
    }
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $body.on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /*
  NAV-SUBMIT LINK EVENT LISTENER
  */
  $navSubmit.on("click", () => {
    if (!currentUser) return;
    hideElements();
    $submitForm.slideToggle();
    $allStoriesList.show();
  });

  /*
  NAV-FAVORITE LINK EVENT LISTENER
  */

  $navFavorites.on("click", () => {
    if (!currentUser) return;
    hideElements();
    generateFavorites();
    $favoritedStories.show();
  });

  /*
  NAV-FAVORITE ICON EVENT LISTENER
  */
  $(".articles-container").on("click", ".star", async e => {
    if (!currentUser) return;
    const $target = $(e.target);
    const storyId = $target.closest("li").attr("id");

    // Check if favorite
    if ($target.hasClass("fas")) {
      await currentUser.removeFavorite(storyId);
    } else {
      await currentUser.addFavorite(storyId);
    }
    // toggle class to update icon
    $target.closest("i").toggleClass("fas far");
  });

  /* 
  NAV-MYSTORIES EVENT LISTENER
   */
  $navMyStories.on("click", () => {
    if (!currentUser) return;
    hideElements();
    generateMyStories();
    $ownStories.show();
  });

  /*
  NAV-USER PROFILE LINK EVENT LISTENER
  */
  $navWelcome.on("click", () => {
    hideElements();
    $userProfile.show();
    $userProfile.toggleClass("container");
  });

  /*
  DELETE ICON EVENT LISTENER
  */
  $ownStories.on("click", ".trash-can", async e => {
    // get the Story's ID
    const storyId = $(e.target)
      .closest("li")
      .attr("id");

    // remove the story from the API
    await storyList.removeStory(currentUser, storyId);

    // re-generate the story list
    await generateStories();

    // hide everyhing, but the story list
    hideElements();
    $allStoriesList.show();
  });

  /*
  ADD STORY FORM SUBMIT HANDLER
  */
  $submitForm.on("submit", async e => {
    if (!currentUser) return;
    e.preventDefault();

    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();

    const storyObj = await storyList.addStory(currentUser, {
      author,
      title,
      url
    });

    // Create HTML with response data

    const $li = generateStoryHTML(storyObj);

    $allStoriesList.prepend($li);

    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateUserProfile();
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();

    // get user profile
    generateUserProfile();
  }

  /*
  use current user data 
  */
  function generateUserProfile() {
    // show your name
    $("#profile-name").text(`Name: ${currentUser.name}`);
    // show your username
    $("#profile-username").text(`Username: ${currentUser.username}`);
    // format and display the account creation date
    $("#profile-account-date").text(
      `Account Created: ${currentUser.createdAt.slice(0, 10)}`
    );
    // set the navigation to list the username
    $navUserProfile.text(`${currentUser.username}`);
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /*
  GET MY STORIES AND DISPLAY ON THE DOM
  */
  async function generateMyStories() {
    // get own stories from current user
    const { ownStories } = currentUser;
    // reset the HTML
    $ownStories.empty();

    // generate stories
    if (ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      ownStories.forEach(story =>
        $ownStories.prepend(generateStoryHTML(story, true))
      );
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can for deleting your own story
    const trashCanIcon = isOwnStory
      ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashCanIcon}
      <span class="star">
      <i class="${starType} fa-star"></i>
    </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /*
  GET FAVORITED ARTICLES AND DISPLAY ON THE DOM
  */

  function generateFavorites() {
    // const { favorites } = currentUser;

    $favoritedStories.empty();

    // generate favorites
    if (currentUser.favorites.length === 0) {
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else {
      console.log("here");
      currentUser.favorites.forEach(fav =>
        $favoritedStories.prepend(generateStoryHTML(fav))
      );
    }
  }

  /*
  CHECK IF STORY IS FAVORITE 
  */
  function isFavorite(story) {
    if (!currentUser) return;
    let favStoryIds = new Set();

    favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));

    return favStoryIds.has(story.storyId);
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $userProfile,
      $createAccountForm,
      $favoritedStories
    ];
    elementsArr.forEach($elem => $elem.hide());
    $userProfile.removeClass("container");
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $(".main-nav-links").toggleClass("hidden");
    $navWelcome.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  function handleError(e) {
    $error.slideToggle();
    if (e.response.status === 401) {
      $error.text("Please check your password");
    } else {
      $error.text(e.response.data.error.title);
    }

    console.dir(e);
    setTimeout(() => {
      $error.slideToggle();
    }, 4000);
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
