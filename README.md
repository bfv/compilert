# compilert (WIP)
Multi threaded compiler for OpenEdge with an nodejs engine. Minimum node version is 12.10.0.

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
Compiling would look like `oec -f ./config.json`. At runtime several subdirs (t0, t1, t2, t3 in this example) are created in `session:temp-directory` to store the .r's for the particular thread. When all threads are finished all the subdirs are joined to the target dir. This way collisions when a lot inherit the same base class (f.e. BusinessEntity) are avoided.    
