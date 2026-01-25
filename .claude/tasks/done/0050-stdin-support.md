# Add stdin support to CLI

Add support for reading Elo code from stdin using the `-` argument (Unix convention).

Examples:

- `echo "2 + 3" | eloc -`
- `cat input.elo | eloc - -t ruby`
