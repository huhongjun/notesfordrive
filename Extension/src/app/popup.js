
// -- Analytics --
var _AnalyticsCode = 'UA-52658958-1';
var _gaq = _gaq || [];
_gaq.push(['_setAccount', _AnalyticsCode]);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();
function trackButtonClick(id) {
  _gaq.push(['_trackEvent', id, 'clicked']);
}
// -- Analytics --

var background = chrome.extension.getBackgroundPage();

// this is used to configure whether interactive re-authentication is enabled on 401's (ie. when access tokens expire)
var port = chrome.runtime.connect( {name: 'popup'} );

document.addEventListener('DOMContentLoaded', function()
{
    setupSummernote();
    setupSortable();
    setupRate();
    setupTooltips();
    setupButtons();

    $('.drive-folder-name').text( background.DEFAULT_FOLDER_NAME );

    window.setTimeout(function()
    {
        checkAuth({interactive:false});
    }, 1);
});


chrome.runtime.onMessage.addListener( function(request, sender, sendResponse)
{
    // this will only be called when the cache has been updated with changes.
    // ie. it won't be called if the Drive was checked and there were no changes
    if(request.cacheUpdated || request.initialCacheUpdateComplete)
    {
        displayDocs();
    }

    // this will be sent from any gdrive calls that fail to re-authenticate
    if(request.authenticationFailed)
    {
        authenticationFailed();
    }
});


var savedRange = undefined

function setupSummernote()
{
     var HelloButton = function (context) {
          var ui = $.summernote.ui;

          // create button
          var button = ui.button({
              contents: '<i class="fa fa-child"/> Hello',
              tooltip: 'hello',
              click: function () {
                  // context.invoke('editor.insertText', 'hello');
                  context.invoke('editor.indent');
              }
          });

          return button.render(); // return button as jquery object
      }

      var SaveRangeButton = function (context) {
           var ui = $.summernote.ui;

           var button = ui.button({
               contents: 'Save Range',
               tooltip: 'saveRange',
               click: function () {
                   savedRange = context.invoke('editor.createRange');
               }
           });

           return button.render();
       }

       var RestoreRangeButton = function (context) {
            var ui = $.summernote.ui;

            var button = ui.button({
                contents: 'Restore Range',
                tooltip: 'restoreRange',
                click: function () {
                  if(savedRange) {
                    savedRange.select();
                  }
                }
            });

            return button.render();
        }


      $('.summernote').summernote(
       {
           height: 427,

           minHeight: 427,  // set minimum height of editor
           maxHeight: 427,  // set maximum height of editor

           focus: false,

           placeholder: 'Title',

           buttons: {
             hello: HelloButton,
             saveR: SaveRangeButton,
             restoreR: RestoreRangeButton
           },

           toolbar: [
               ['font', ['bold', 'italic']],
               ['color', ['color']],
               ['para', ['ul', 'ol']],
               ['mybutton', ['hello', 'saveR', 'restoreR']]
           ],

           callbacks: {
             onChange: onContentChange,
             onPaste: onContentPaste,
             onKeydown: onKeyDown
           }
       });


    $('.note-editor').css('border', 'none');
    $('.note-resizebar').css('display', 'none');

    $('.note-btn').attr('tabindex', '-1');
    $('.note-editable').attr('tabindex', '-1');
}


function setupButtons()
{
    $('#settings-button').click( function()
    {
      trackButtonClick("open-settings");
      chrome.tabs.create({'url': chrome.extension.getURL("src/options/options.html") } );
    });

    $('#new-button').click( function()
    {
      trackButtonClick("create-note");
      createDocument();
    });

    $('#authorize-button').click( function()
    {
      trackButtonClick("authorize");
      checkAuth({interactive:true});
    });

    $("#trash-button").click( function()
    {
        trackButtonClick("trash");
        var activeDoc = $('.summernote').data('editing-doc');

        if(activeDoc) {
            trashDocument(activeDoc);
        }
    });

    $("#edit-in-drive-button").click( function()
    {
      trackButtonClick("edit-in-drive");
        var activeDoc = $('.summernote').data('editing-doc');

        if(activeDoc && activeDoc.item) {
            chrome.tabs.create({ url: activeDoc.item.alternateLink });
        }
    });
}


function setupSortable()
{
    $("#notes-list").sortable(
    {
        stop: function(event, ui)
        {
            reorderDocumentCacheForDivs();
            updateActiveArrow();
        }
    });
}


function setupRate()
{
    var CHECK_INTERVAL = 30;

    $('#rate-button').click( function()
    {
        trackButtonClick("rate");
        $('#rate-dialog').hide();
        $('#rate-overlay').hide();
        chrome.storage.sync.set({'rated': true});

        chrome.tabs.create({'url': "http://chrome.google.com/webstore/detail/notes-for-google-drive/ndidogegapfaolpcebadjknkdlladffa/reviews"} );
    });

    $('#rate-dismiss-button').click( function()
    {
        trackButtonClick("rate-dismiss");
        $('#rate-dialog').hide();
        $('#rate-overlay').hide();

        // reset opens counter
        chrome.storage.sync.set({'opened': 0});

        // increase the checkAt count exponentially so as not to annoy users
        chrome.storage.sync.get(null, function(result)
        {
            var checkAt = result['check-at'] + CHECK_INTERVAL;
            chrome.storage.sync.set({'check-at': checkAt});
        });
    });

    chrome.storage.sync.get(null, function(result)
    {
        var rated = result['rated'];
        var opened = result['opened'];
        var checkAt = result['check-at'];

        if(!opened) opened = 0;
        if(!checkAt) checkAt = CHECK_INTERVAL;

        if(!rated && opened >= checkAt)
        {
            $('#rate-dialog').show();
            $('#rate-overlay').show();
        }

        chrome.storage.sync.set({'opened': opened+1});
        chrome.storage.sync.set({'check-at': checkAt});
    });
}


function setupTooltips()
{
    $('#trash-button').tooltip();
    $('#edit-in-drive-button').tooltip();
}


function applyPrefs()
{
    chrome.storage.sync.get('space-paragraphs-pref', function(result)
    {
        var spaceParagraphs = result[ 'space-paragraphs-pref' ];

        if(!spaceParagraphs)
        {
            $(".note-editable p").css("margin", "0");
            $(".note-editable ul, ol").css("margin-top", "0");
        }
        else
        {
          // reset any changes jquery has made to the selectors in question
          $('.note-editable p').attr('style','');
          $('.note-editable ul, ol').attr('style','');
        }
    });
}

/*
function onDocumentFocus(e)
{
    var doc = $('.summernote').data('editing-doc');

    if(doc)
    {
        doc.cursorPos = document.getSelection().anchorOffset;
        console.log("onDocumentFocus doc.cursorPos = " + doc.cursorPos);
    }
}*/

function onKeyDown(e) {
  if(e.keyCode == 9) {
    console.log('tab key pressed');
    // if(cursor on line with list item) {
      // context.invoke('editor.indent');
      // $('#summernote').summernote('editor.insertText', "whoa");
      $('#summernote').summernote('editor.insertText', 'hello world');
      // $('#summernote').summernote('editor.indent');
    // }
    // else {}
    //   insertTextAtCursor("\t");
    // }
    // e.preventDefault();
    // e.stopPropagation();
  }
}

function onContentPaste(event) {
}

function onContentChange(contents, $editable) {

    // TODO nested lists
    // - add a new method to Summernote/Bullet (or ideally not modifying summernote source and just use the exposed methods)
    //   that either creates a new list if the current line (editable?) isn't a list, otherwise indents the current list item
    // - use that method for the list button (instead of the default) as a custom button
    // - update bullet char for different list levels
    // - two enters on a list should end the list and goto a new line

    updateAndSaveContentToCurrentDocument();
}

function updateAndSaveContentToCurrentDocument() {
    var doc = $('.summernote').data('editing-doc');

    if(doc && !doc.ignoreChanges)
    {
        doc.dirty = true;
        //doc.cursorPos = document.getSelection().anchorOffset;
        doc.contentHTML = $('.summernote').summernote('code');
        doc.selectionRange = $('#summernote').summernote('createRange');

        updateDocumentTitle(doc);
        saveDocument(doc);
    }
}


function checkAuth(options)
{
    //console.log("in checkAuth");

    if(!navigator.onLine)
    {
        updateDisplay();
        return;
    }

    if(background.gdrive)
    {
        if( !background.gdrive.oauth.hasAccessToken() )
        {
            background.gdrive.auth(options, authenticationSucceeded, authenticationFailed);
        }
        else
        {
            //background.gdrive.googleAuth.printAccessTokenData();

            // we have an access token - even if its expired it will be automatically refreshed on the next server call
            authenticationSucceeded();
        }
    }
}

function authenticationSucceeded()
{
    //console.log("in authenticationSucceeded");

    displayDocs();

    // update the cache every time the user opens the popup incase changes have been made to the documents in drive
    background.updateCache();
}

function authenticationFailed(errorCode)
{
    console.log("Authentication failed with code: " + errorCode);
    updateDisplay();
}

function cacheUpdateFailed(errorCode)
{
    console.log("Cache update failed with code: " + errorCode);
    updateDisplay();
}


function displayDocs()
{
    $("#notes-list").empty();

    if(background.cache.documents.length)
    {
        $.each(background.cache.documents, function(index, doc)
        {
            addDocument(doc);

            if(background.lastActiveDocId && doc.item && background.lastActiveDocId == doc.item.id)
            {
                setActiveDoc(doc);
            }
        });

        // if we didn't set an active doc then set the first
        if( $('.active').length == 0 ) {
            setActiveDoc( background.cache.documents[0] );
        }
    }

    updateDisplay();
}


function addDocument(doc)
{
    // we wont have an item if we've got a doc from createDocument and it hasn't yet been saved
    var id = doc.item ? doc.item.id : guid();

    var e = $("<div class='notes-list-item'/>");
    e.attr('id', id);
    e.data('doc', doc);

    doc.$notesListElement = e;

    e.click(function() {
        setActiveDoc(doc);
    });

    e.append( $("<p>" + doc.title + "</p>") );

    $("#notes-list").append( e );
    $("#notes-list").sortable('refresh');

    recalculateSpacerHeight();
}


function setActiveDoc(doc)
{
    // NOTE: if the current active document has pending changes then it will still have
    // a timer running on it that will save the changes

    if(!doc) {
        updateDisplay();
        return;
    }

    // don't do anything if we're already the active doc
    if( isActiveDoc(doc) ) {
      return;
    }

    setLastActiveDocument(doc);
    applyPrefs();

    var content = resolveChecklists(doc.contentHTML);

    doc.ignoreChanges = true;
    $('.summernote').data('editing-doc', doc);
    $('.summernote').summernote('code', content);
    doc.ignoreChanges = false;


    focusActiveInput();

    $('#active-note-status').empty();
    if(doc.item) {
        $('#active-note-status').text('Last change was ' + moment(doc.item.modifiedDate).fromNow());
    }


    var $listItem = doc.$notesListElement;

    $('.notes-list-item').removeClass('active');
    $listItem.addClass('active');

    updateActiveArrow();
    updateDisplay();
}


function resolveChecklists(content) // rename TaskLists
{
    return content;

    /*
    var checked_replace = '<input type="checkbox" checked />';
    var unchecked_replace = '<input type="checkbox" />';

    var result = content.replace(/\[checked\]/gi, checked_replace);
    result = result.replace(/\[unchecked\]/gi, unchecked_replace);

    return result;*/
}


function trashDocument(doc)
{
    if(doc.item)
        background.gdrive.trashFile(doc.item.id);

    doc.$notesListElement.remove();
    recalculateSpacerHeight();

    var documents = background.cache.documents;

    // remove the document from the cache
    var index = documents.indexOf(doc);
    if(index > -1) {
        documents.splice(index, 1);
    }

    // display the next available document
    var nextDoc = null;

    if(documents.length > 0)
    {
        if(index > 0) {
            nextDoc = documents[index - 1];
        }
        else {
            nextDoc = documents[index];
        }
    }

    setActiveDoc(nextDoc);

    // BUG FIX - force a refresh as for some reason the container doesn't redraw correctly (leaves a white background color)
    $('#notes-list-container').hide().show(0);
}


function createDocument(title, content)
{
    title = title || 'New Note';
    content = content || '';

    var doc = {
        item: null,
        title: title,
        contentHTML: content,
        requiresInsert: true
    };

    background.cache.documents.push(doc);

    addDocument(doc);
    setActiveDoc(doc);

    // scroll to bottom with animation
    $('#notes-list-container').stop().animate({
      scrollTop: $("#notes-list-container")[0].scrollHeight
    }, 800);
}


function saveDocument(doc)
{
    if(!doc || !doc.dirty || doc.saving)
        return;

    var started = function()
    {
        if( isActiveDoc(doc) )
        {
            $('#active-note-status').text('Saving..');
        }
    }

    var completed = function()
    {
        if( isActiveDoc(doc) )
        {
            // update the last active doc id with the new doc.item.id (for newly inserted docs)
            setLastActiveDocument(doc);

            $('#active-note-status').text('All changes saved to Drive');
        }
    };

    // we do a save on the background thread so that it will continue to save
    // outstanding changes even if the popup is closed
    background.saveDocument(doc, started, completed);
}


function updateActiveArrow()
{
    $('.notes-list-item .arrow').remove();

    var activeDoc = $('.summernote').data('editing-doc');

    if(activeDoc)
    {
        var isFirst = background.cache.documents[0] == activeDoc;
        var arrowIcon = isFirst ? "notes-arrow-light-grey.svg" : "notes-arrow-white.svg";

        activeDoc.$notesListElement.prepend( $("<img class='arrow' src='img/" + arrowIcon + "'/>") );
    }
}


function showSection(div)
{
    showSections( [div] );
}

function showSections(divs)
{
    $('#auth-section').toggle( arrayContains('#auth-section', divs) );
    $('#message-section').toggle( arrayContains('#message-section', divs) );
    $('#loading-section').toggle( arrayContains('#loading-section', divs) );
    $('#first-use-section').toggle( arrayContains('#first-use-section', divs) );
    $('#documents-section').toggle( arrayContains('#documents-section', divs) );
    $('#actions-section').toggle( arrayContains('#actions-section', divs) );
}


function updateDisplay()
{
    if(!navigator.onLine)
    {
        showSection('#message-section');

        $("#message-content").text("You don't appear to have an internet connection.");
        $('#message-content').center();

        return;
    }

    if( !background.gdrive.oauth.hasAccessToken() )
    {
        showSection('#auth-section');
        $('#auth-content').center();
    }
    else
    {
        if(background.state == background.StateEnum.CACHING && background.cache.lastUpdated == null)
        {
            showSection('#loading-section');
            $('#loading-content').center();
        }
        else
        {
            chrome.storage.sync.get(null, function(result)
            {
                var hasSeenInstructions = result['seen-instructions'];

                if(!hasSeenInstructions)
                {
                    $('#first-use-got-it-button').click( function()
                    {
                        chrome.storage.sync.set({'seen-instructions': true});
                        updateDisplay();
                    });

                    showSection('#first-use-section');
                }
                else
                {
                    if(background.cache.documents.length > 0)
                    {
                        showSections( ['#documents-section', '#actions-section'] );

                        focusActiveInput();
                        recalculateSpacerHeight();
                    }
                    else
                    {
                        showSections( ['#message-section', '#actions-section'] );

                        $('#message-content').text("You don't have any notes. Create one using the pencil icon below.");
                        $('#message-content').center();
                    }
                }
            });
        }
    }
}


function focusActiveInput()
{
    var activeDoc = $('.summernote').data('editing-doc');

    if(activeDoc)
    {
        // only set the focus in the text area when there is empty content
        if(activeDoc.contentHTML == null || activeDoc.contentHTML.length == 0)
        {
            $('.summernote').summernote({focus:true});
        }
        else
        {
            // force summernote to un-focus text input
            $('.note-editable').blur();
        }

        // TODO look into using summernote createRange/save/restore or its internal
        // classes to save and restore the range - note that the structure of the initial html
        // might not match what the doc content is once the doc is opened/restored so the range may not work without
        // some extra work
    }
}


function isActiveDoc(doc)
{
    return $('.summernote').data('editing-doc') == doc;
}


function setLastActiveDocument(doc)
{
    if(doc.item)
    {
        background.lastActiveDocId = doc.item.id;
        chrome.storage.sync.set({'last-active-doc-id': doc.item.id});
    }
}


function updateDocumentTitle(doc)
{
    var title = extractTitle(doc.contentHTML);

    if(!title || title.length == 0)
        title = 'Untitled';

    if(title != doc.title)
    {
        doc.title = title;
        doc.$notesListElement.children('p').text(doc.title);
    }
}

function extractTitle(html)
{
    if(!html || html.length == 0)
        return null;

    html = stripTag('style', html);

    var firstParagraph = null;

    if(html && html.length && html.charAt(0) != '<') {
      firstParagraph = contentUntil('<', html);
    } else {
      firstParagraph = contentOfFirstOf(['span','p'], html) || contentUntilFirstOf(['span','p'], html) || html;
    }

    var text = stripTags(firstParagraph);

    if(!text || text.length == 0)
        return null;

    text = text.replace(/&lt;/g, '');
    text = text.replace(/&gt;/g, '');
    text = text.replace(/&nbsp;/g, ' ');

    MAX_TITLE_WORDS = 10;
    return text.split(' ').slice(0, MAX_TITLE_WORDS).join(' ');
}


function reorderDocumentCacheForDivs()
{
    var reordered = [];

    $('#notes-list').children().each( function()
    {
        var doc = $(this).data('doc');

        if(doc)
            reordered.push(doc);
    });

    if(reordered.length == background.cache.documents.length)
    {
        background.cache.documents = reordered;
    }
}


function recalculateSpacerHeight()
{
    var listHeight = $('#notes-list').height();
    var containerHeight = $('#documents-section').height();

    var height = containerHeight - listHeight;

    if(height < 0)
    {
        height = 0;
        $('#notes-list-container').css('overflow-y', 'scroll');
    }
    else
    {
        $('#notes-list-container').css('overflow-y', 'hidden');
    }

    $('#notes-list-space').css('height', (height)+'px');
}
