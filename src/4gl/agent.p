
block-level on error undo, throw.

using Progress.Json.ObjectModel.JsonObject from propath.
using Progress.Json.ObjectModel.ObjectModelParser from propath.
using Progress.Json.ObjectModel.JsonArray from propath.
using Progress.Lang.AppError from propath.

function setupClientSocket returns logical() forward.
function createHttpMessage returns longchar (body as JsonObject) forward.

define variable listener as handle no-undo.
define variable params as character no-undo.
define variable thread# as integer no-undo.
define variable basedir as character no-undo.
define variable port as integer no-undo.
define variable serverport as integer no-undo.
define variable currentMessage as longchar no-undo.
define variable currentMessageNumber as integer no-undo.
define variable compileDestination as character no-undo.

define variable currentContentType as character no-undo.
define variable httpClient as handle no-undo.
define variable currentCompileErrors as JsonArray no-undo.

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
            when 'serverport' then
                serverport = integer(paramValue).
        end case.
    end.
    
end procedure.

procedure initialize private:
   
    file-info:file-name = basedir.
    if (file-info:file-type = ?) then 
        undo, throw new AppError(substitute("basedir '&1 does not exist'", basedir)).
    
    compileDestination = basedir + '/t' + string(thread#).    
    file-info:file-name = compileDestination.
    
    if (file-info:file-type = ?) then
        os-create-dir value(compileDestination).
    
    compiler:multi-compile = true.

    session:suppress-warnings = true.
    
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
    
    currentCompileErrors = new JsonArray().
    
    fileArray = json:GetJsonArray('files').
    do i = 1 to fileArray:Length:
        fileToCompile = fileArray:GetCharacter(i). 
        run compileFile(fileToCompile).       
    end.
    
    run sendMessageToServer.
    
end procedure.

procedure compileFile private:
    
    define input parameter fileToCompile as character no-undo.
    
    define variable errorJson as JsonObject no-undo.
    
    do on error undo, throw:
        compile value(fileToCompile) save into value(compileDestination).
        
        catch err1 as Progress.Lang.Error :
            // nothing for now
            errorJson = new JsonObject().
            errorJson:Add('file', fileToCompile).
            errorJson:Add('error', err1:GetMessage(1)).
            currentCompileErrors:Add(errorJson).
        end catch.
    end.
    
end procedure.


function setupClientSocket returns logical():
    
    define variable resultOK as logical no-undo.
    
    create socket httpClient.
    resultOK = httpClient:connect(substitute('-H localhost -S &1', serverport)).
    
    return resultOK.
    
end function.

function closeClientSocket returns logical ():
    httpClient:disconnect().    
end function.

procedure sendMessageToServer private:
    
    define variable json as JsonObject no-undo.
    define variable messageText as longchar no-undo.
    define variable messageBytes as memptr no-undo.
    define variable messageSizeInBytes as integer no-undo.
    
    setupClientSocket().
    
    json = new JsonObject().
    json:Add('thread', thread#).
    
    if (currentCompileErrors:Length = 0) then
        json:Add('status', 'ok').
    else do:
        json:Add('status', 'error').
        json:Add('errors', currentCompileErrors).
    end.
        
    messageText = createHttpMessage(json).
    messageSizeInBytes = length(messageText, 'raw') + 1.
    set-size(messageBytes) = messageSizeInBytes.
    put-string(messageBytes, 1) = messageText.

    httpClient:write(messageBytes, 1, messageSizeInBytes - 1).
    
    closeClientSocket().
    
    finally:
        set-size(messageBytes) = 0.
    end.
    
end procedure.


function createHttpMessage returns longchar (body as JsonObject):
    
    define variable separator as character initial '~r~n' no-undo.
    define variable messageText as longchar no-undo.
    define variable bodyText as longchar no-undo.
    
    messageText = 'POST / HTTP/1.1' + separator.
    messageText = messageText + 'Host: localhost:' + string(serverport) + separator.
    messageText = messageText + 'Accept: */*' + separator.
    messageText = messageText + 'Content-Type: application/json' + separator.
    
    body:Write(bodyText, true).    
    messageText = messageText + substitute('Content-Length: &1', length(bodyText, 'raw')).
    
    // end headers
    messageText = messageText + separator + separator.
    
    messageText = messageText + bodyText.

    return messageText.
    
end function.
