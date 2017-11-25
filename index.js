const express = require('express'); 
const serveStatic = require('serve-static'); 
const path = require('path'); 
const mkdirp = require('mkdirp');
const zlib = require('zlib');
const fs = require('fs');
const args = require('yargs').argv; 
const pump = require('pump'); 
const bodyParser = require('body-parser'); 
const tar = require('tar');
const fileUpload = require('express-fileupload');
const resourcesPath = path.resolve(__dirname,'./resources'); 
const zipFilesPath = path.resolve(__dirname, './zipfiles'); 

var app = express();
app.use((req,resp,next)=>{
    logVerbose(`Got request from: ${req.url}`);
    logVerbose(`Got request from: ${req.host}`);
    next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(serveStatic(path.resolve(__dirname,'resources')));
app.use(fileUpload()); 

function ensureProject(fullPath){
    return new Promise((res, rej) => {
        mkdirp(fullPath, (err) => {
            if (err) {
                rej(err);
                return;
            }
            res(fullPath);
        });
    });
}

function logVerbose(message){
    if (args.verbose){
        console.log(message);
    }
}

function ensureProjectDirectory(projectName){
    return ensureProject(path.resolve(resourcesPath, projectName));
}

app.post('/upload', async (req, response) => {
    logVerbose(`${(new Date()).toISOString()}: New request has been received`);
    if (req.body.projectName){

        try {
            const projectPath = await ensureProjectDirectory(req.body.projectName); 
            const unzipper = zlib.createGunzip(); 
            const filePath = projectPath + '.gzip';
            logVerbose(`${(new Date()).toISOString()}: Moving file to resources folder`);
            req.files.prototypes.mv(filePath,(err)=>{
                if (err){
                    logVerbose(`${(new Date()).toISOString()}: Error has occured while moving file to resources folder ${err.message}`);
                    response.send({
                        status:false,
                        data:err.message
                    });
                    return; 
                }
                const reader = fs.createReadStream(filePath);
                logVerbose(`${(new Date()).toISOString()}: Attempting to unzip prototype folder ${filePath}`);
                pump([
                    reader,
                    unzipper,
                    tar.extract({
                        Directory: true,
                        cwd: projectPath,
                    })
                ], (err) => {
                    if (err) {
                        logVerbose(`${(new Date()).toISOString()}: Could not unzip folder because: ${err.message}`);
                        response.send({
                            status: false,
                            data: err.message
                        });
                        return;
                    }
                    logVerbose(`${(new Date()).toISOString()}: Prototype unzipped successfully`);
                    response.send({
                        status: true,
                        data: 'All good'
                    });
                });

            });
            
        }catch(err){
            logVerbose(`An error has occured: ${err.message}`);
            response.send({
                status: false,
                data: err.message
            }); 
        }
        
    }else {
        logVerbose('No project name provided');
        resp.send({
            status:false,
            data:'Please provide valid project name'
        });
    }
});

async function init(){
    await ensureProject(resourcesPath); 
    await ensureProject(zipFilesPath);
}

mkdirp(resourcesPath,(err)=>{
    if (err){
        console.log(`An error has occured: ${err.message}`);
        return; 
    }
    app.listen(args.port || 7878,(err)=>{
        console.log(`server is up on port ${args.port || 7878}`);
    });
});
