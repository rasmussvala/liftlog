# One entry per exercise per day

The user logs only their best set of the day for each exercise, not every set they did. So there is at most one entry per exercise per calendar day (the user's local date). Once a day has an entry, the app offers to edit it instead of adding another. This keeps the chart to one point per day with no grouping rules, and matches how the user trains: they care about the top set, not the volume.

Each entry stores the weight and reps the user lifted, not the estimated 1RM. The estimated 1RM is always computed from them, so the chart can show what was lifted, and a change of formula later needs no data migration.

## Considered Options

- **Log every set and chart each day's best.** More flexible, but more typing on the phone and data the user doesn't want.
