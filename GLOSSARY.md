# liftlog

A personal tracker for one lifter's estimated one-rep max on a handful of main lifts.

## Language

**Exercise**:
A lift the user tracks, such as squat or bench press, identified by a name they choose. Names are unique, ignoring case. The user sets the order exercises appear in. Deleting an exercise deletes its entries too.
_Avoid_: Lift, movement

**Entry**:
The best set the user did for one exercise on one day, recorded as a weight in kg and a number of reps. There is at most one per exercise per day.
_Avoid_: Set, record, workout

**Exercise log**:
One exercise with all its entries, newest first. What the exercise screen shows.

**Estimated 1RM**:
The heaviest single rep the user could likely lift, worked out from an entry with the Epley formula. It is always derived from an entry, never entered directly.
_Avoid_: Max, PR, one-rep max (on its own)

**Target**:
The lightest weight, in 2.5 kg steps, that at a given number of reps would give an Estimated 1RM above the current one: the latest entry's, not the all-time best. The exercise screen shows one for every rep count from 1 to 12.
_Avoid_: Goal, suggestion

**Range**:
The span of time the progress chart shows: M, 6M, Y or All. Each is a rolling window ending today, so 6M is always the last 6 months. All fits every entry.
_Avoid_: Period, zoom, filter

**Backup**:
A file holding all exercises and entries, which the user exports and can import to restore their data.
_Avoid_: Export, dump, snapshot
