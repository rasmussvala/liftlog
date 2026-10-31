# Hash routing

Screens use hash URLs such as `#/exercise/3` instead of path URLs such as `/exercise/3`. The app is hosted on GitHub Pages under `/liftlog/`, which can't send every path to `index.html`. Path URLs would return a 404 on reload or when opened from the home screen, unless we add a `404.html` redirect workaround. Hash URLs need no server support, and the URLs don't matter to the user.
