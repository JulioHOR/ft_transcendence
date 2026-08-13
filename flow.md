# Transcendence - Virtual Co-Work

Virtual Co-Work is a virtual environment, rendered in 3d from the first person perspective, where users can interact by proximity voice chat and multi-user activities. 

# Main Flow

We are going to describe here the main flow of the project from the perspective of a single user. From there we will list all the features and possibilities during operation.

## Login

The user will first be presented with a complete login flow, where it is possible to:

- Create new account
- Recover password
- Login

## Dashboard

Right after the login the user is directed to it's dashboard, where all the overlaying features lie.

### User Settings
- Change profile image
- Update Password
- Edit 3d avatar character
- Set backup email address

### Spaces List

A list of all the available "offices" that the user can visit, as well as their state of availability (on / offline).

>[!NOTE]
> ***The spaces are hosted by other users, in order for it to be available the user needs to be online***

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
- **Games**: places the user can play a game along with other users, like a table-top game.

### Proximity voice chat
The envs control how close each user are to each other, that determines if they can be heard by each other, this simulates a "physical" interaction, where users need to be in the same room in order to interact. 

## Env Controls
In order to navigate the envs we are keeping it simple with WASD to move, mouse to look and F to interact. Where Interact will have a few different contexts and WASD will also be used to navigate UI in a few of those contexts. 

