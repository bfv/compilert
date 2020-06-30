
block-level on error undo, throw.

using Progress.Json.ObjectModel.JsonObject from propath.
using Progress.Json.ObjectModel.ObjectModelParser from propath.
using Progress.Json.ObjectModel.JsonArray from propath.
using Progress.Lang.AppError from propath.

define variable listener as handle no-undo.
define variable params as character no-undo.
define variable thread# as integer no-undo.
define variable basedir as character no-undo.
define variable port as integer no-undo.
define variable currentMessage as longchar no-undo.
define variable currentMessageNumber as integer no-undo.
define variable compileDestination as character no-undo.

define variable currentContentType as character no-undo.

do on error undo, throw:
    
    run processParameters.
    run initialize.
    
    run setupListener.
    
    wait-for 'close' of this-procedure.
    
    run destroyListener.
    
end.

finally:
    quit.
end.

procedure setupListener private:

    create server-socket listener.
    listener:set-connect-procedure('processClientConnect').    
    listener:enable-connections('-S ' + string(port)).    
    listener:sensitive = true.
    
end procedure.

procedure destroyListener private:
    listener:sensitive = false.
    listener:disable-connections().
    delete object listener.
end procedure.

procedure processClientConnect private:
    
    define input parameter socketHandle as handle no-undo.
    
    define variable success as logical no-undo.

    currentMessage = ''.
    currentMessageNumber = 0.
    
    success = socketHandle:set-read-response-procedure('socketIO') no-error.
    if (not success or error-status:error) then do:
        // handle error
        message 'fout' view-as alert-box.
    end.
    
    listener:sensitive = false.  // stop accepting messages until this one is finished
        
end procedure.


procedure socketIO private:
    
    define variable bytesAvailable as integer no-undo.
    define variable messageBytes as memptr no-undo.
    define variable messageString as longchar no-undo.
    
    currentMessageNumber = currentMessageNumber + 1.

    bytesAvailable = self:get-bytes-available().
    if (bytesAvailable = 0) then do:
        // currentMessage now holds the entire message
        run processMessage(currentContentType, currentMessage).
        listener:sensitive = true.
        return.
    end.
        
    set-size(messageBytes) = bytesAvailable.
    self:read(messageBytes, 1, bytesAvailable, read-exact-num).
    
    copy-lob messageBytes to messageString.
    
    if (currentMessageNumber = 1) then do: 
        currentContentType = entry(1, messageString, '~r~n').
        messageString = substring(messageString, length(currentContentType) + 3).
    end.
    
    if (messageString = 'quit') then do:
        apply 'close' to this-procedure.
    end.
    
    currentMessage = currentMessage + messageString.
    
    finally:
        set-size(messageBytes) = 0.
    end.
            
end procedure.

        
procedure processParameters private:
    
    define variable numParams as integer no-undo.
    define variable i as integer no-undo.
    define variable paramName as character no-undo.
    define variable paramValue as character no-undo.
    
    numParams = num-entries(session:parameter).
    do i = 1 to numParams:
        paramName = entry(1, entry(i, session:parameter), '=').
        paramValue = entry(2, entry(i, session:parameter), '=').
        case paramName:
            when 't' then
                thread# = integer(paramValue).
            when 'basedir' then
                basedir = paramValue.
            when 'port' then
                port = integer(paramValue).
        end case.
    end.
    
end procedure.

procedure initialize private:
   
    file-info:file-name = basedir.
    if (file-info:file-type = ?) then 
        undo, throw new AppError(substitute("basedir '&1 does not exist'", basedir)).
    
    compileDestination = basedir + '/t' + string(thread#).    
    file-info:file-name = compileDestination.
    // message compileDestination file-info:file-type view-as alert-box.
    if (file-info:file-type = ?) then
        os-create-dir value(compileDestination).
        
end procedure.

procedure processMessage private:
    
    define input parameter contentType as character no-undo.
    define input parameter content as longchar no-undo.
    
    define variable json as JsonObject no-undo.
    define variable parser as ObjectModelParser no-undo.
    
    if (contentType <> 'application/json') then
        return.
    
    parser = new ObjectModelParser().
    json = cast(parser:Parse(content), 'Progress.Json.ObjectModel.JsonObject').
    
    do on error undo, throw:
        run value('process' + json:GetCharacter('command') + 'Command')(json).
    end.
    
end procedure.


procedure processCompileCommand private:
    
    define input parameter json as JsonObject no-undo.
    
    define variable fileArray as JsonArray no-undo.
    define variable fileToCompile as character no-undo.
    define variable i as integer no-undo.
    
    fileArray = json:GetJsonArray('files').
    do i = 1 to fileArray:Length:
        fileToCompile = fileArray:GetCharacter(i). 
        run compileFile(fileToCompile).       
    end.
    
end procedure.

procedure compileFile private:
    
    define input parameter fileToCompile as character no-undo.
    
    compile value(fileToCompile) save into value(compileDestination).
    
end procedure.