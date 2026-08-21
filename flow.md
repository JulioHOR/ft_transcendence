# Transcendence - Virtual Co-Work

Virtual Co-Work is a virtual environment, rendered in 3d from the first person perspective, where users can interact by proximity voice chat and multi-user activities. 

# Main Flow

We are going to describe here the main flow of the project from the perspective of a single user. From there we will list all the features and possibilities during operation.

## Login

The user will first be presented with a complete login flow, where it is possible to:

- Create new account
- Recover password
- Login / Logout

## Dashboard

Right after the login the user is directed to it's dashboard, where all the overlaying features lie.

### User Settings
- Change profile image
- Update Password
- Edit 3d avatar character
- Config the new email address

### Notifications
A list of notifications that the user can receive, like invites to other envs, friend requests.

### Features Game

- A list of games that the user has played, with the possibility to see the results and statistics.
- The ranking of the user in the games, with the possibility to see the ranking of other users.

### Spaces List

A list of all the available "offices" that the user can visit, as well as their state of availability (on / offline).

>[!NOTE]
> ***The spaces are hosted by other users, in order for it to be available the user needs to be online***

>[!OPTIONAL]
> The spaces can be view in the minimap, where the user can see the location of the spaces and the other users.

### Friends List

A list of friends that are saved by adding them as a friend.
The only function of this list is to present the user with the status and location (virutal environment) of other users.

### Sign-out button
A sign-out button at the end of the list or even by a corner of the dash.

### Audio Settings
Here the user can select the audio device for input and output, as well as the volume levels.

### A spaces creator pagge (button-to)
From the dashboard, the user can get to this page, where it is possible to choose a type of environment, name it and host it. 

>[!NOTE]
>***Every environment created and saved in the server will hold a list of users that can activelly join it and it's owner***

>[!NOTE]
>***Users can join other environment by receiving invites***

>[!NOTE]
>***All users can access the main co-work space, that could be the place to know and add new friends***

## Virtual Env
Here is the virtual environment main view, where the user can navigate, interact and talk to other users. Lets now refer to it as env or envs, because we are getting acquainted already.

### Interactibles
Some objects and regions of the envs are interactible, pre-determine by the designer and following the categories:

- **Seats**: places where the user can sit, mostly applyed to chairs and couches.
- **Workstations**: places the user can assume the `working` status, and is mostly used on computers and specila machinery.
- **Game**: the users can play a game along with other users, like a table-top game.
- **Whiteboard**: the users can write and draw together, like a professional whiteboard.

### Proximity voice chat
The envs control how close each user are to each other, that determines if they can be heard by each other, this simulates a "physical" interaction, where users need to be in the same room in order to interact. 

### Env Controls
In order to navigate the envs we are keeping it simple with WASD to move, mouse to look and F to interact. Where Interact will have a few different contexts and WASD will also be used to navigate UI in a few of those contexts. 

### Perspective View

- The envs are rendered in 3d from the first person perspective, where the user can look around and move in a 3d space. 
- The user can also see other users and their avatars, as well as the interactible objects and regions.
- The viewmodel of the user is a 3d model of the parts of the body that are visible from the first person perspective, like the hands and arms. 
    - The viewmodel can be customized by the user, like change set the guns, swords, staffs, etc.
- The other users are represented by their 3d avatars.

## The Map

- **First Aproach**: a closest environment to a real office, with a few environments, where the users can interact and work together.
- **Second Aproach**: a larger open space, with some distance between the environments, simulating a map to be explored. 

## Game

**Turn-Based Artillery**: a game where the users can play a turn-based artillery game, like Worms or GunBound.

- The game is played in a 2d interface.
- The player has a personal character and can control the angle and power of the shot, and possibly the type of weapon.
- The player can also move the character around the map, but with a limited amount of movement.
- The view has two states:
    - One for the player that is the current turn.
    - Another when the action is being executed, where the player can see the result of the action.
- The game is turn-based, where each player has a limited time to make their move.
- The game can be played by 2 or more players, and the winner is the last player standing.
