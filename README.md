# compilert
Multi threaded compiler for OpenEdge with an nodejs engine. Minimum node version is 12.10.0.

Tools like PCT can use more than 1 thread for compilation, OpenEdge however saves apart from the class it's compiling also the Base Class(es). When more than one thread tries to save the same base class at same moment, the session stops/crashes. Compilert compiles in several threads (processes actually), each using its own directory. When finished all the .r's are copied to the target directory.

## configuration
The working idea is to be able to use more than 1 core for compiling your OE project based on a configuration like this:
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
  
Compiling can be done with `oec` command. By default the configuration is expected to in `.oecconfig` in the current directory. A different config file can be specified tith the `-f` parameter. At runtime several subdirs (t0, t1, t2, t3 in this example) are created in `${targetdir}/.oec` to store the .r's for the particular thread. When all threads are finished all the subdirs are copied/joined to the `targetdir`. This way collisions when a lot classes inherit the same base class (f.e. BusinessEntity) are avoided.

## CLI arguments
Compilert is ran by the `oec` command which looks for `.oecconfig` in the current directory. The `-f <file>` parameter can be used to compile a diffent configuration (possibly in a different directory). <br/>
To see all CLI options use `oec --help`.

Note: the boolean CLI arguments can be set to false by adding `no-` before the parameter name. So setting the counter option to false would look like `--no-counter`. The may be appropriate when a value is set to `true` in the `.oecconfig` file but one want to override that on the CLI. CLI parameters take precedence over their `.oecconfig` counterparts.

## exit codes
0 is obviously no errors. 1 means validation/configuration errors. 2 represents compilation errors.

## Runtime behavior
After issuing an `oec` command `index.ts` is ran. `index.ts` parses the command line args, runs some validations and start a `ServerProcess` instance (`serverprocess.ts`). 
```
        ┌──────┐
        │ srvr │ node.js (>= 12.10.0)
        └──────┘
      /         \  tcp/http
     /           \
┌──────┐        ┌──────┐
│  t0  │ ...... │  tn  │ prowin/_progres
└──────┘        └──────┘
```
The server (via `init` method)  creates the targetdir, start a listener and starts the threads instances (`thread.ts`). Threads is a misleading term since it actually start external prowin/_progres processes. After this the `start` method of the `ServerProcess` is ran. The `start` fetches all files to compile and drive the threads to compile. The files are compiled in groups of `batchSize`. When a batch is compiled, the 4GL process send back a (http) message and get a new batch. Note: if `batchSize` is very large the situation can occur that all but one threads are finished and thus the entire compile session has to wait for 1 thread to finish.

When all threads are finished they are sent a quit message upon which the 4GL process shuts down itself (literally a `quit`).

In the `targetdir` an `.oec` directory is created. In the latter every thread has its own directory (t0, ..., tn). Note that n = batchSize - 1 ;-)
After everything is finished the contents of `.oec/tx` is copied to `targetdir`.
