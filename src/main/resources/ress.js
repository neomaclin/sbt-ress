(function ress() {

    "use strict";

    var args = process.argv;

    var rework = require('rework');
    var stringify = require('css').stringify;
    var split = require('rework-split-media');
    var moveMedia = require('rework-move-media');

    var _ = require('lodash');
    var mkdirp = require("mkdirp");
    var path = require("path");
    var fs = require('fs');
    var options = {compress: true};

    var minWidth = /\(min-width:([0-9]+)px\)/;
    var maxWidth = /\(max-width:([0-9]+)px\)/;
    var minHeight = /\(min-height:([0-9]+)px\)/;
    var maxHeight = /\(max-height:([0-9]+)px\)/;
    var mediaTypes = /(all|print|screen)/;
    var orientation = /orientation(landscape|portrait)/;

    var SOURCE_FILE_MAPPINGS_ARG = 2;
    var OPTIONS_ARG = 3;

    var sourceFileMappings = JSON.parse(args[SOURCE_FILE_MAPPINGS_ARG]);
    var medias = JSON.parse(args[OPTIONS_ARG]);

    var sourcesToProcess = sourceFileMappings.length;
    var results = [];
    var problems = [];

    function compileDone() {
         console.log("\u0010" + JSON.stringify({results: results, problems: problems}));
    }

    function throwIfErr(e) {
               if (e) throw e;
    }

    function endsWith(str, suffix) {
               return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function read(file) {
        return fs.readFileSync(file, 'utf8');
    }

    function write(name, data){
        return fs.writeFileSync(name, data, 'utf8');
    }

    function rename(source, devicetype){
        return source.replace(".min.css", "-"+ devicetype +".min.css");
    }

    function getMatches(regx, str, value){
        var result = str.match(regx);
        return (result == null) ? value : _.last(result);
    }

    var getMaxWidth = function(tag){
        return (_.isString(tag)) ? parseInt(getMatches(maxWidth, tag, Infinity)): Infinity;
    };

    var getMinWidth = function(tag){
        return (_.isString(tag)) ? parseInt(getMatches(minWidth, tag, -1)) : -1;
    };

    var getMaxHeight = function(tag){
        return (_.isString(tag)) ? parseInt(getMatches(maxHeight, tag, Infinity)): Infinity;
    };

    var getMinHeight = function(tag){
        return (_.isString(tag)) ? parseInt(getMatches(minHeight, tag, -1)) : -1;
    };
    var getType = function(tag){
        return (_.isString(tag)) ? getMatches(mediaTypes, tag, '') : '';
    };
    var getOrientation = function(tag){
        return (_.isString(tag)) ? getMatches(orientation, tag, '') : '';
    };
    function groupsOf(tag){
        var tags = tag.split('and');

        var widthLowerbound = _.max(_.map(tags, getMinWidth));
        var widthUpperbound = _.min(_.map(tags, getMaxWidth));
        var heightLowerbound = _.max(_.map(tags, getMinHeight));
        var heightUpperbound = _.min(_.map(tags, getMaxHeight));
        var types = _.compact(_.map(tags, getType));
        var orientations = _.compact(_.map(tags, getOrientation));


        var checkRage = function(dimension, upperbound, lowerbound) {
            if (upperbound == Infinity) {
                if (lowerbound == -1) {
                    return false;
                }else{
                    return dimension.min >= lowerbound;
                }
            } else {
                if (lowerbound == -1) {
                    return dimension.max <= upperbound;
                }else{
                    return upperbound <= dimension.max &&  lowerbound >= dimension.min;
                }
            }

        };

        var checkOrientation = function(media) {return _.intersection(orientations, media.orientation).length > 0};

        var checkType = function(media) { return _.intersection(types, media.type).length > 0 };

        var checkParameter = function(media) {
            return checkRage(media.width, widthUpperbound, widthLowerbound) ||
                   checkRage(media.height,heightUpperbound,  heightLowerbound) ||
                   checkOrientation(media) ||
                   checkType(media);
        };

        return _.map(_.filter(medias, checkParameter), function(media){ return media.device; });

    }

    function mapReduce(tags, stylesheets){
        return _.chain(tags)
            .map(function(tag){ return ' @media ' + tag + '{' + stringify(stylesheets[tag], options) + '}'; })
            .reduce(function(left, right){return left + right;})
            .value();
    }

    sourceFileMappings.forEach(function(sourceFileMapping) {

        var input = sourceFileMapping;
       
        var output = rename(input, "responsive");
        var outputLog = input + ".devices.log";
        
        var outputDevices = [];

        try{

            var stylesheets = split(rework(read(input)).use(moveMedia()));

            write(output, read(input));

            var devices = _.chain(stylesheets)
                .omit('')
                .keys()
                .map(function(tag){ return { name: tag, groups: groupsOf(tag) }; })
                .map(function(ob){ return _.map(ob.groups, function(group){return { device: group, tagName: ob.name};})})
                .flatten()
                .groupBy(function(group){ return group.device;})
                .mapValues(function(value){return _.map(value, function(vo){return vo.tagName;})})
                .value();

            write(outputLog, JSON.stringify(devices));
            
            var general = stringify(stylesheets[''],options);
            var breakpoints = _.reduce(medias, function(result,n){ 
                                        result[n.device] = n.breakpoint;
                                        return result;
                                    }, {}
                                );

             _.chain(devices)
               .mapValues(function(tags){ return general + mapReduce(tags, stylesheets); })
               .forEach(function(value, key){
                            var deviceOutPut = rename(input, key);
                            var newValue = (["t","m"].indexOf(key) >= 0) ? value.replace(/\(max-width:[\d]+px\)/gi,"(max-width:"+breakpoints[key]+"px)") : value
                            write(deviceOutPut, newValue);
                            console.log(deviceOutPut);
                     }).value();

        } catch (err) {
                         console.log("error:"+err.message);
                         problems.push({
                             message: err.message,
                             severity: "error",
                             source: input
                         });

                    
                         compileDone();
                     }

    });


})();