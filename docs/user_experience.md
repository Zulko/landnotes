This document attempts to capture all the specs of the user experience in the app.
It aims to be a useful reference for human developers and AI coding assistants.

# The App

- Landnotes is mostly a map with "markers" indicating places or regions.
- The user can zoom in and out of the map, revealing markers at different levels of detail.
- Hovering or clicking on a marker reveals information from wikipedia (the exact behavior varies on desktop and mobile).
- The app has two main modes: showing geographic places, or showing historical events.

## Shareable links

- At any point, a user can share the link in the URL bar with anyone else who will be able to see the same map (location, date, selected marker, etc.)

## Browsing history

- Every time a user moves the map or selects a marker, this adds to the browsing history (and updates the URL).
- When the user uses their browser's back button, the map will move back to the previous recorded state.
- Currently, the use of Wikipedia iframes makes the "back button" behavior a bit complicated and browser-dependent.

## Layout

- The main component, taking almost the full screen, is the map with markers.
- Overlaid at the top of the map, there is a "Menu" with a search bar, a date selector (in "events" mode), and drop-down options which mainly serves to switch between the two .
- There is a sliding pane that will appear (on the left on mobile, on the bottom on desktop) to show wikipedia pages and lists of events.

# Markers

Marker hover/click behavior is different between mobile/desktop and between place/event modes.
This explains the general complexity of the code around these.

On mobile devices:

- Tapping a marker centers the map on it and reveals its popup
- Tapping the marker again reveals its wikipedia page.

On desktop:

- Hovering over a marker reveals its popup
- Clicking on a marker centers the map on it and reveals its wikipedia page.

For place markers:

- The popup is a wikipedia summary with a photo and a short text cut at ~300 characters.
- The popup is not enterable on desktop, leaving the marker closes the popup.

For event markers:

- The popup is a card who/where/what.
- The popup has links to the people and places mentioned in the popup.
- Clicking on the links in the popup opens their wikipedia pages in the side pane.
- The popup can be entered on desktop, leaving the marker or the popup closes the popup.
- On desktop, hovering the links in the popup reveals a tooltip with the wikipedia summary.

## Geographic places

- Places with a larger wikipedia page are shown at higher levels of zoom.

# Historical events

## Side pane

The side pane is used to show the wikipedia page.

On wide screens, the side pane appears from the left, on narrow screens it appears from the bottom.

On narrow screens, the side pane takes the full screen first.

The side pane has tabs,

- "Wikipedia" (shows the wikipedia page)
- "Events" (shows the events associated with the page, either because their were extracted from the page because they happen at the location that the page represents or involved the person that the page represents). In that tab, the app first fetches a list of event IDs by year. Then it displays the events in collapsible sections by year. If the total number of events is less than 500, it fetches all event infos at once. Else the event data is only fetched when the user clicks on a year section.

The side pane is also used in for two other displays:

- When a user clicks "see more events at this location" in the map, it shows the events that happened at the same place at the same date specified by the user.
- The "About" tab also shows in the side pane.
