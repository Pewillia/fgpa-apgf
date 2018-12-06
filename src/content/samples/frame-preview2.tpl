<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta content="width=device-width,initial-scale=1" name="viewport">

    <link rel="stylesheet" href="https://geoappext.nrcan.gc.ca/fgpv/fgpv-latest-2.x/rv-styles.css" />

    <style>
        body {
            display: flex;
            flex-direction: column;
        }

        .myMap {
            height: 100%;
        }
    </style>
</head>

<body>

<div id="fgpmap" is="rv-map" class="myMap"  rv-service-endpoint="https://internal.rcs.gcgeo.gc.ca/" data-rv-keys='' data-rv-config="config" data-rv-langs=''>
    <noscript>
        <p>This interactive map requires JavaScript. To view this content please enable JavaScript in your browser or download a browser that supports it.</p>

        <p>Cette carte interactive nécessite JavaScript. Pour voir ce contenu, s'il vous plaît, activer JavaScript dans votre navigateur ou télécharger un navigateur qui le prend en charge.</p>
    </noscript>
</div>

<script>
    var needIePolyfills = [
        'Promise' in window,
        'TextDecoder' in window,
        'findIndex' in Array.prototype,
        'find' in Array.prototype,
        'from' in Array,
        'startsWith' in String.prototype,
        'endsWith' in String.prototype,
        'outerHTML' in SVGElement.prototype
    ].some(function(x) { return !x; });
    if (needIePolyfills) {
        // NOTE: this is the only correct way of injecting scripts into a page and have it execute before loading/executing any other scripts after this point (ie polyfills must be executed before the bootstrap)
        // more info on script loading: https://www.html5rocks.com/en/tutorials/speed/script-loading/
        document.write('<script src="../ie-polyfills.js"><\/script>');
    }
</script>

<script type="text/javascript">
    // set window.config to pass the config object to the data-rv-config
    // the object needs to be attach to the window object
    window.config = JSON.parse(localStorage.getItem('configpreview'));

    // set viewer array of languages
    document.getElementById('fgpmap').setAttribute('data-rv-langs', localStorage.getItem('configlangs'));

    // set viewer keys
    document.getElementById('fgpmap').setAttribute('data-rv-keys', localStorage.getItem('configkeys'));

    // set viewer version
    var scriptTag = document.createElement('script');
    var version = localStorage.getItem('viewerversion');
    var envar = localStorage.getItem('viewerenv');
    envar = (envar === 'dev') ? 'dev.' : '';
    scriptTag.src = 'https://{env}gcgeo.gc.ca/fgpv/fgpv-x.x.x/rv-main.js'.replace('x.x.x', version).replace('{env}', envar);
    document.body.appendChild(scriptTag);
    localStorage.removeItem('configlangs');
    localStorage.removeItem('configpreview');
    localStorage.removeItem('viewerversion');
    localStorage.removeItem('viewerenv');
</script>

</body>
</html>
