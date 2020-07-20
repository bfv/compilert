# compilert
Multi threaded compiler for OpenEdge with an nodejs engine. Minimum node version is 12.10.0.

Tools like PCT can use more than 1 thread for compilation, OpenEdge however saves apart from the class it's compiling also the Base Class(es). When more 1 one thread tries to save the same base class at same moment, the session stops/crashes. Compilert compiles in several threads, each using its own directory. When finished all the .r's are copied to the target directory.

The working idea is to be able to use more than 1 core for compiling you OE project based on a configuration like this:
```
{
    "dlc": "c:/dlc/122",
    "executable": "prowin.exe",
    "threads": 4,
    "minport": 3055,
    "maxport": 3075,
    "workdir": "C:/dev/oe/compilert/src/4gl",
    "srcroot": "c:/dev/oe/compilert/src/4gl",
    "targetdir": "c:/dev/oe/compilert/tmp",
    "batchSize": 4,
    "deleteRcode": false,
    "verbose": false,
    "startupParameters": [
        "-basekey", "INI",
        "-ininame", "c:/dev/oe/compilert/config/progress.ini",
        "-b"
    ]
}
```

Now, compilert uses a orchestrator (node.js) process which communicates to the agents (OpenEdge) via TCP ports. The amount of ports is `threads + 1`. These ports are picked between `minport` and `maxport`. 
- `workdir` is the OE workdir (`.`).
- `sourceroot` is the base directory from which the sources are searched from.
- `targetdir` is the directory where all the resulting .r's are copied (in their respective subdirs)
- `batchSize` the amount of source which are handed over to the agents in one go.
- `deleteRcode` if true, the .r's in the `targetdir` are deleted first, default `true`.
- `verbose` gives information on threads and more. Default is silent where only errors are reported.
- `startupParameters` is an array of parameters. Note: `-pf blabla.pf` should go as `"-pf"` and `"blabla.pf"` in this array.  
  
Compiling can be done with `oec`. By default the configuration is exprected to in `.oecconfig` in the current directory. A different config file can be specified tith the `-f` parameter. At runtime several subdirs (t0, t1, t2, t3 in this example) are created in `${targetdir}/.oec` to store the .r's for the particular thread. When all threads are finished all the subdirs are copied/joined to the `targetdir`. This way collisions when a lot classes inherit the same base class (f.e. BusinessEntity) are avoided.
