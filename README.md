Site at: https://cwu-vkd-lab.github.io/CWU-AI-VKD-Website/

# To install dependencies:
`npm i`

# To test:
`npm run dev`

# To build:
`npm run build`

# To deploy to github pages:
Build before doing this.

`npm run deploy`

This requires write access to the repository. This updates the gh-pages branch.

# How to edit web page content:

All website formatting, text, titles, etc. are controled in the index.html file in the src directory. The code is written in html. The easiest way to navigate this file is to find the header for the section you are looking to edit. For example, if you want to edit the help section, find the header div for "help-window". To edit text content, alter the text in the relavant div.

Example code from the index.html for help window:

```html
<!--
<div id="help-window" class="help-window"> // THIS IS THE HEADER TITLE
      <button id ="close-help-window" class="close-help-window">
        <img src="/src/images/CloseBtn.png" alt="Close"> // DEFINES THE BUTTON
      </button>
      <h2> // EDIT TEXT SECTION HERE
        Each node is a document. Click on one to see its information.
        They are clustered by topic and linked if they share citations.
      </h2>
-->
```
