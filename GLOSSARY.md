# liftlog

A personal tracker for one lifter's estimated one-rep max on a handful of main lifts.

## Language

**Exercise**:
A lift the user tracks, such as squat or bench press, identified by a name they choose.
_Avoid_: Lift, movement

**Entry**:
The best set the user did for one exercise on one day, recorded as a weight in kg and a number of reps. There is at most one per exercise per day.
_Avoid_: Set, record, workout

**Exercise log**:
One exercise with all its entries, newest first. What the exercise screen shows.

**Estimated 1RM**:
The heaviest single rep the user could likely lift, worked out from an entry with the Epley formula. It is always derived from an entry, never entered directly.
_Avoid_: Max, PR, one-rep max (on its own)

**Backup**:
A file holding all exercises and entries, which the user exports and can import to restore their data.
_Avoid_: Export, dump, snapshot
