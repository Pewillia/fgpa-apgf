<!DOCTYPE html>
<html class="no-js" lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <title>FGP</title>
    <!-- Meta data -->
    <meta name="description" content="Author of the Federal Geospatial Platform">
    <meta name="dcterms.title" content="Author - Federal Geospatial Platform">
    <meta name="dcterms.creator" content="Natural Resources Canada">
    <meta name="dcterms.issued" title="W3CDTF" content="2015-08-06">
    <meta name="dcterms.modified" title="W3CDTF" content="2017-09-20">
    <meta name="dcterms.subject" title="scheme" content="">
    <meta name="dcterms.language" title="ISO639-2" content="eng">
    <meta content="width=device-width,initial-scale=1" name="viewport">
    <link href="//wet-boew.github.io/themes-dist/GCWeb/GCWeb/assets/favicon.ico" rel="icon" type="image/x-icon">
    <link rel="stylesheet" href="//wet-boew.github.io/themes-dist/GCWeb/GCWeb/css/theme.min.css">
    <link rel="stylesheet" href="/font-awesome/css/font-awesome.min.css">
  	<link rel="stylesheet" href="//dev.gcgeo.gc.ca/fgp.css">
    <link rel="stylesheet" href="/av-styles.css" />
    <style>
	  .av-accordion-icon {
		top: 22px!important;
	  }
	  .av-accordion-content {
		padding-top: 30px!important;
	  }
      .fgpMapParent {
        height: 100%!important; /*56vh;  viewport height */
        width: 100%!important;
        display: inline-block!important;
		margin-bottom: 30px;
      }
      .fgpMapParentFirefox {
        height: 69vh;!important; /* viewport height */
        width: 100%!important;
        display: inline-block!important;
		margin-bottom: 30px;
      }
      main div.fgpMap  {
        border: 1px solid black;
        margin-top:0px;
        margin-left:0px;
        margin-right:0px;
        margin-bottom: 0px;
        position: relative;
      }
      main div.fgpMapFirefox  {
        border: 1px solid black;
        margin-top:0px;
        margin-left:0px;
        margin-right:0px;
        margin-bottom: 0px;
        position: relative;
		height: 69vh!important;
      }
  		.fgpbuttons {
  			margin-left: 0px;
  			margin-right: 0px;
  			margin-top: 0px;
  			margin-bottom: 0px;
        background-color: #606060;
  		}
  		.fgpbutton {
  			background-image: linear-gradient(#1c761c,#1c761c);
  			border-color: #1c761c;
  			color: #ffffff;
  		}
  		.fgpbutton:hover,
  		.fgpbutton:focus,
  		.fgpbutton:active {
  		  background: buttonface;
  		  border-color: #cccccc;
  		  color: #000000;
  		}
      .fgpcontainer {
        margin-right: 0px;
        margin-left: 0px;
        padding-left: 0px;
        padding-right: 0px;
        width: auto!important;
      }
      .fgplogo {
        height: 30px;
        position: relative;
        top: -2px;
        padding-right: 5px;
      }
      #fgpSignIn {
        padding: 0px;
      }
      .fgpButtonRow {
    		margin-left: 0px!important;
    		margin-right: 0px!important;
    		border-top: 1px solid white;
    	}
      .fgpMapRow {
    		margin-left: 0px!important;
    		margin-right: 0px!important;
    	}
    	.panel-body {
    		padding: 0px!important;
    	}
      .fgpv md-sidenav.site-sidenav .app-logo.rv-no-logo h1, [is=rv-map] md-sidenav.site-sidenav .app-logo.rv-no-logo h1 {
          padding: 0 0 0 0!important;
      }
    </style>

    <!-- Google Tag Manager DO NOT REMOVE OR MODIFY - NE PAS SUPPRIMER OU MODIFIER -->
  	<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  	new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  	j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  	'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  	})(window,document,'script','dataLayer','GTM-WNKVQCG');</script>
  	<!-- End Google Tag Manager -->
</head>

<body vocab="//schema.org/" typeof="WebPage">
  <!-- Google Tag Manager DO NOT REMOVE OR MODIFY - NE PAS SUPPRIMER OU MODIFIER -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WNKVQCG"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager -->

    <ul id="wb-tphp">
        <li class="wb-slc">
            <a class="wb-sl" href="#wb-cont">Skip to main content</a>
        </li>
        <li class="wb-slc visible-sm visible-md visible-lg">
            <a class="wb-sl" href="#wb-info">Skip to "About this site"</a>
        </li>
    </ul>

    <header role="banner">
        <div id="wb-bnr" class="container">
            <section id="wb-lng" class="visible-md visible-lg text-right">
                <h2 class="wb-inv">Language selection</h2>
                <div class="row">
                    <div class="col-md-12">
                        <ul class="list-inline margin-bottom-none">
                            <li><a lang="fr" href="javascript:toggleLanguage();">Français</a></li>
                        </ul>
                    </div>
                </div>
            </section>
            <div class="row">
                <div class="brand col-xs-8 col-sm-9 col-md-6">
                    <a href="//www.canada.ca/en/index.html">
                        <object type="image/svg+xml" tabindex="-1" data="//wet-boew.github.io/themes-dist/GCWeb/GCWeb/assets/sig-blk-en.svg"></object><span class="wb-inv"> Government of Canada</span></a>
                </div>
                <section class="wb-mb-links col-xs-4 col-sm-3 visible-sm visible-xs" id="wb-glb-mn">
                    <h2>Search and menus</h2>
                    <ul class="list-inline text-right chvrn">
                        <li><a href="#mb-pnl" title="Search and menus" aria-controls="mb-pnl" class="overlay-lnk" role="button"><span class="glyphicon glyphicon-search"><span class="glyphicon glyphicon-th-list"><span class="wb-inv">Search and menus</span></span></span></a></li>
                    </ul>
                    <div id="mb-pnl"></div>
                </section>
                <section id="wb-srch" class="col-xs-6 text-right wb-inv">
                    <h2>Search</h2>
                    <form action="#" method="post" name="cse-search-box" role="search" class="form-inline">
                        <div class="form-group">
                            <label for="wb-srch-q" class="wb-inv">Search website</label>
                            <input id="wb-srch-q" list="wb-srch-q-ac" class="wb-srch-q form-control" name="q" type="search" value="" size="27" maxlength="150" placeholder="Search GCTools" style="height: 22px;">
                            <datalist id="wb-srch-q-ac">
                                <!--[if lte IE 9]><select><![endif]-->
                                <!--[if lte IE 9]></select><![endif]-->
                            </datalist>
                        </div>
                        <div class="form-group submit">
                            <button type="submit" id="wb-srch-sub" class="btn btn-primary btn-small" name="wb-srch-sub"><span class="glyphicon-search glyphicon"></span><span class="wb-inv">Search</span></button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
        <div id="app-brand" data-ajax-replace="/en/include/fgpBranding.html" data-trgt="app-brand">
        </div>
        <nav role="navigation" id="wb-sm" data-ajax-replace="/dist/ajax/sitemenuEnViewer.html" data-trgt="mb-pnl" class="wb-menu visible-md visible-lg" typeof="SiteNavigationElement">
        </nav>
        <nav role="navigation" id="wb-bc" property="breadcrumb" class="wb-inv">
            <h2>You are here:</h2>
            <div class="container">
                <div class="row">
                    <ol class="breadcrumb">
                      <li><a href="fgp-intranet.html">Home</a></li>
                      <li>Federal Geospatial Platform Visualiser</li>
                    </ol>
                </div>
            </div>
        </nav>
    </header>

    <main role="main" property="mainContentOfPage" class="fgpcontainer">
        <section>
        <div class="fgpa av-large"
                data-av-langs='["en-CA", "fr-CA"]'
                data-av-extensions='["./extensions/ddr/ddr.js", "./extensions/agol/agol.js"]'
                data-av-schema="./schemaForm/"
                data-av-config='["./config/canada-world-en.json", "./config/canada-world-fr.json", "./config/config-sample.json"]'>
            <av-header></av-header>

            <div class="av-tools" layout="row">
                <av-tab flex="70"></av-tab>
                <div class="av-summary" flex="30">
                    <av-summary></av-summary>
                </div>
            </div>
        </div>
        </section>
    </main>

    <div id="divFooter" class="mrgn-tp-0 mrgn-bttm-0" style="border-top: 2px solid #1C761C;">
      <footer role="contentinfo" id="wb-info" data-ajax-replace="//dev.gcgeo.gc.ca/en/include/fgpFooter.html" data-trgt="wb-info">
      </footer>
      <a href="#bottom"></a>
    </div>

    <script src="https://code.jquery.com/jquery-2.2.4.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
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
            document.write('<script src="//wet-boew.github.io/fgpv/fgpv-latest/ie-polyfills.js"><\/script>');
        }
    </script>
	<script src="//dev.gcgeo.gc.ca/aut/fgpa-latest/form/tv4.js"></script>
    <script src="//dev.gcgeo.gc.ca/aut/fgpa-latest/av-main.js"></script>
    <script src="//dev.gcgeo.gc.ca/aut/fgpa-latest/form/angular-schema-form-bootstrap-bundled.min.js"></script>
    <script>
        // Toggle language
        function toggleLanguage(){
            location.replace(window.location.href.replace('-en', '-fr'));
        }
    </script>
    <script src="//wet-boew.github.io/v4.0-ci/wet-boew/js/wet-boew.min.js"></script>
    <script src="//wet-boew.github.io/themes-dist/GCWeb/GCWeb/js/theme.min.js"></script>
</body>
</html>
