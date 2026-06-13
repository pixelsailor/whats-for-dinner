**Repro steps**

1. Shut down with logged-in account on AI exclusive page (suggested recipe for instance)
2. Wait for session expiration
3. Reload app with expired session, resuming history from last page

**Results**
1. Dialog appears requesting to sync recipes -- presence of "log in" button and lack of "What's for Dinner" link indicates the user is not logged-in.

**Expected Behavior**
1. There should not have been any dialog suggesting to sync recipes. Current user has no cloud privledges when not authenticated.
2. App should have resumed with the current "User" in an "anonymous" mode, possibly redirecting to the Recommendations page.