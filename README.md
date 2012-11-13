Rally Kanban
============

![Title](https://raw.github.com/RallyApps/Kanban/master/screenshots/title-screenshot.png)

## Overview

The Kanban Board app provides teams with the option of managing pull-based, lean software development projects with other iterative and time-boxed projects. The Kanban Board allows the user to trigger an update to the Schedule State field for any drag-and-drop action from one column to another column. Using the Schedule State field enables a shared view of work in Rally regardless of the methodology that each team practices because many pages in Rally such as Release Status show status and roll-ups based on the Schedule State field.

Product backlog, time-boxed iterations, and estimation are unnecessary when using a Kanban system since work is pulled into the board and the queue is the only work of interest. Achieving maximum throughput is the main goal by determining bottlenecks in the system and limiting the work in progress to reduce task context switching and ensure work is completed efficiently and quickly.

In other words, a Kanban board only shows the next few stories that need to be completed and it's current state of progress. The stories are determined by your project's backlog and the state of any story is changed as you drag the story across any state.

## How to Use

### Running the App

If you want to start using the app immediately, create an Custom HTML app on your Rally dashboard. Then copy App.html from the deploy folder into the HTML text area. That's it, it should be ready to use. See [this](http://www.rallydev.com/help/use_apps#create) help link if you don't know how to create a dashboard page for Custom HTML apps.

Or you can just click [here](https://raw.github.com/RallyApps/Kanban/master/deploy/App.html) to find the file and copy it into the custom HTML app.

### Using the App

When you first run the app, you can specify the types of columns you want to have by the Group By drop down menu. Some of options you can select are Defect Status, Package, Schedule State, Task Status, and Test Cases Status. You can also specify the work-in-progress (WIP) limit (the number of cards on the column) and what column represents the state of the user story/defect (choose between Defined, In-Progress, Completed, and Accepted). Note if you choose Schedule State, your columns are already represented for you.

![Setup](https://raw.github.com/RallyApps/Kanban/master/screenshots/setup-screenshot.png)

To switch states of cards, just click on the card header and drag it to the column of your choosing. The column will highlight to show you where the card will go. Don't worry if you made a mistake and need to revert a card back to its original place, all state changes will be made no matter which direction you go in.

![Drag](https://raw.github.com/RallyApps/Kanban/master/screenshots/drag-screenshot.png)

You can still go into the user story/defect detail page by clicking on the user story/defect ID on the top left of the card.

## Customize this App

You're free to customize this app to your liking (see the License section for details). If you need to add any new Javascript or CSS files, make sure to update config.json so it will be included the next time you build the app.

This app uses the Rally SDK 1.32. The documentation can be found [here](http://developer.rallydev.com/help/app-sdk). 

Available Rakefile tasks are:

    rake build                      # Build a deployable app which includes all JavaScript and CSS resources inline
    rake clean                      # Clean all generated output
    rake debug                      # Build a debug version of the app, useful for local development
    rake deploy                     # Deploy an app to a Rally server
    rake deploy:debug               # Deploy a debug app to a Rally server
    rake deploy:info                # Display deploy information
    rake jslint                     # Run jslint on all JavaScript files used by this app, can be enabled by setting ENABLE_JSLINT=true.

## License

Kanban is released under the MIT license.  See the file [LICENSE](https://raw.github.com/RallyApps/Kanban/master/LICENSE) for the full text.