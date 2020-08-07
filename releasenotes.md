# `release notes`

`2.7.0` 
- `.` in `srcroot` and `basedir`are nog relative to `workidir` 
- fixed workdir/basedir/.. bug where `.` was not resolved

`2.6.0`
- #40 added --dlc & --executable cli option
  
`2.5.1`
- fixed .oecconfig.template.json not in npm package 

`2.5.0` 
- #36 implemented gitignore style `excludes` for `sourcesets` 
  
`2.4.0`
- #8 implemented source sets
- #33 added --create option to create .oecconfig
- display directory info when --delete and --verbose
- #34 fixed error when --delete is used and targetdir is not under .oecconfig dir

`2.3.0` 
- refactored displaying time
- #30 relative paths possible for basedir/srcroot/targetdir/workdir
  
`2.2.0`
- #27 added --threads CLI parameter
- #28 fixed elapsed time display bug
  
`2.1.1` & `2.1.2`
- updates on README.md & releasenotes.md 
  
`2.1.0`
- #25 added basedir config property
- #26 added elapsed time to --verbose output
  
`2.0.0`
- #16 make CLI argument negatable
- refactor: handling defaults
- #19 added --batchsize CLI parameter
- #23 added --listconfig CLI parameter
- #20 added validation for dlc, executable, workdir, srcroot & batchsize
- #24 added --workdir and --srcroot CLI parameters
- #21 config parameter names in lowercase (MAJOR)
  
`1.2.0`
- #14 added --targetdir (-t) CLI parameter
- #15 refactored/consolidated sources into src/lib
- #13 return exit code 2 upon compilation errors
- bugfix for counter always being displayed (#11)

`1.1.0`
- #11 added optional counter (-c) 
- fixed recursive mkdir bug

`1.0.4`
- updated docs
- removed `make-dir` package
  
`1.0.3`
- updated docs
- removed `@types/del` package
  
`1.0.2`
- added check for node.js >= 12.10.0
  
`1.0.1`
- bumped lodash version 
  
`1.0.0`
- initial version