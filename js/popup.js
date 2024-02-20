let currentPromptIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    ensureAllPromptsHaveIds();
    setupGreeting();
    setupFocusHandling();
    setupFormVisibility();
    setupSearchFunctionality();
    loadAndDisplayPrompts();

    const addButton = document.getElementById('add-prompt');
    addButton.addEventListener('click', () => {
        const form = document.getElementById('prompt-form');
        form.setAttribute('data-editing-id', '');
        form.classList.add('visible');
        showOverlay();
    });

    document.getElementById('prompt-list').addEventListener('click', (event) => {
        if (event.target.matches('.edit-button')) {
            handleEdit(event);
        } else if (event.target.matches('.delete-button')) {
            handleDelete(event);
        }
    });

    document.getElementById('prompt-form').addEventListener('submit', handleFormSubmit);
});

function ensureAllPromptsHaveIds() {
    chrome.storage.local.get({prompts: []}, (data) => {
        const updatedPrompts = data.prompts.map((prompt) => prompt.id ? prompt : {...prompt, id: Date.now().toString()});
        chrome.storage.local.set({prompts: updatedPrompts});
    });
}


function setupGreeting() {
    const greetingElement = document.getElementById('greeting');
    const hours = new Date().getHours();
    greetingElement.textContent = `Good ${hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening'}`;
}

function setupFocusHandling() {
    const searchInput = document.getElementById('search-input');
    const searchDiv = document.getElementById('prompt-search');
    searchInput.addEventListener('focus', () => searchDiv.classList.add('focused'));
    searchInput.addEventListener('blur', () => searchDiv.classList.remove('focused'));
}

function setupFormVisibility() {
    const form = document.getElementById('prompt-form');

    document.getElementById('close-button').addEventListener('click', () => {
        form.classList.remove('visible');
        hideOverlay(); // Ensure overlay is hidden when form is closed
    });
}

function handleFormSubmit(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    const form = event.target; // Get the form element
    const promptTitle = form.querySelector('#prompt-name').value.trim();
    const promptContent = form.querySelector('#prompt-content').value.trim();
    
    // Validate prompt title and content
    if (!promptTitle || !promptContent) {
        showNotification('Please fill in all fields.');
        return;
    }

    const editingId = form.getAttribute('data-editing-id');

    chrome.storage.local.get({prompts: []}, function(data) {
        let prompts = data.prompts;
        let isEdit = false;

        if (editingId) {
            prompts = prompts.map(prompt => {
                if (prompt.id === editingId) {
                    isEdit = true;
                    return {...prompt, title: promptTitle, content: promptContent};
                }
                return prompt;
            });
            showNotification('Prompt updated successfully!');
        } else {
            const newPrompt = {id: Date.now().toString(), title: promptTitle, content: promptContent};
            prompts.unshift(newPrompt); // Add new prompt to the beginning of the array
            showNotification('Prompt saved successfully!');
        }

        chrome.storage.local.set({prompts: prompts}, function() {
            // Reset form fields and hide the form
            form.reset();
            form.removeAttribute('data-editing-id');
            form.classList.remove('visible');
            hideOverlay();

            // Reload or update the prompt list based on the action (edit or add)
            if (isEdit) {
                loadAndDisplayPrompts();
            } else {
                loadAndDisplayPrompts(true); // Reload prompt list to display the newly added prompt
            }
        });
    });
}

function handleDelete(event) {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    const promptId = event.target.getAttribute('data-id');
    chrome.storage.local.get({ prompts: [] }, data => {
        const updatedPrompts = data.prompts.filter(prompt => prompt.id !== promptId);
        chrome.storage.local.set({ prompts: updatedPrompts }, () => {
            console.log('Prompt deleted successfully!');
            removePromptFromList(promptId); // Remove prompt from UI
            // Update the UI only after the deletion process is completed
            displayUpdatedPrompts(updatedPrompts);
            hideOverlay(); // Hide overlay after successful delete
        });
    });
}

function removePromptFromList(id) {
    const promptElement = document.querySelector(`.prompt-list_item[data-id="${id}"]`);
    if (promptElement) {
        promptElement.remove();
    }
    // Close the detailed view if it's open for the deleted prompt
    const detailedView = document.getElementById('view-prompt');
    if (detailedView && detailedView.querySelector('.delete-button').getAttribute('data-id') === id) {
        detailedView.remove();
    }
}



function loadAndDisplayPrompts(loadMore = false) {
    const promptsPerPage = 6;

    chrome.storage.local.get({ prompts: [] }, (data) => {
        let promptsToDisplay;
        if (loadMore) {
            startIndex = currentPromptIndex;
            endIndex = Math.min(currentPromptIndex + promptsPerPage, data.prompts.length);
        } else {
            startIndex = 0;
            endIndex = Math.min(promptsPerPage, data.prompts.length);
        }
        promptsToDisplay = data.prompts.slice(startIndex, endIndex);

        if (!loadMore) {
            promptsToDisplay = promptsToDisplay.reverse();
        }

        appendPrompts(promptsToDisplay);
        currentPromptIndex = endIndex;
        document.getElementById('load-more-prompts').style.display = currentPromptIndex < data.prompts.length ? 'block' : 'none';
    });
}



function appendPrompts(prompts) {
    const listElement = document.getElementById('prompt-list');

    prompts.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.classList.add('prompt-list_item');
        promptElement.dataset.id = prompt.id; // Set the data-id attribute for potential future use
        promptElement.innerHTML = `
            <div class="top-content">
                <h3>${prompt.title}</h3>
                <p>${truncateString(prompt.content, 90)}</p>
            </div>
            <div class="bottom-content">
                <button class="view-button" data-id="${prompt.id}">Open</button>
                <button class="copy-button fa fa-copy icon" data-content="${prompt.content}"></button>
            </div>
        `;
        listElement.appendChild(promptElement);

        // Attach event listeners correctly
        const viewButton = promptElement.querySelector('.view-button');
        viewButton.addEventListener('click', handleView); // Pass the event handler directly without wrapping it

        const copyButton = promptElement.querySelector('.copy-button');
        copyButton.addEventListener('click', copyHandler);
    });
}





function displayPrompts(prompts) {
    const listElement = document.getElementById('prompt-list');
    listElement.innerHTML = ''; // Clear the list to update with new prompts

    prompts.forEach(prompt => {
        const promptElement = document.createElement('div');
        promptElement.className = 'prompt-list_item'; // Add class for styling
        promptElement.innerHTML = `
            <div>
                <h3>${prompt.title}</h3>
                <p>${truncateString(prompt.content, 90)}</p>
            </div>
            <div>
                <button class="view-button" data-id="${prompt.id}">Open</button>
                <button class="copy-button fa fa-copy icon" data-content="${prompt.content}"></button>
            </div>
        `;
        listElement.prepend(promptElement); // Use prepend to add the newest prompts at the top
    });

    addViewAndCopyListeners(); // Add listeners for newly added view and copy buttons
}




function handleView(event) {
    let element = event.target.closest('.view-button'); // Ensure we're getting the correct element with data-id
    if (element && element.dataset.id) {
        const promptId = element.dataset.id;
        chrome.storage.local.get({prompts: []}, data => {
            const promptToView = data.prompts.find(prompt => prompt.id === promptId);
            if (promptToView) {
                let existingViewPrompt = document.getElementById('view-prompt');
                if (existingViewPrompt) {
                    existingViewPrompt.remove();
                }

                const viewPromptElement = document.createElement('div');
                viewPromptElement.id = 'view-prompt';
                viewPromptElement.classList.add('prompt-container');
                viewPromptElement.innerHTML = `
                    <div class="prompt-view">
                        <h3>${promptToView.title}</h3>
                        <p>${promptToView.content}</p>
                    </div>
                    <div class="prompt-actions">
                        <button class="copy-button" data-content="${promptToView.content}">Copy</button>
                        <button class="edit-button" data-id="${promptToView.id}">Edit</button>
                        <button class="delete-button" data-id="${promptToView.id}">Delete</button>
                    </div>
                    <button id="close-view-button">Close</button>
                `;

                document.body.appendChild(viewPromptElement);
                document.querySelector('#view-prompt .copy-button').addEventListener('click', copyHandler);
                document.querySelector('#view-prompt .edit-button').addEventListener('click', () => handleEdit(promptToView.id));
                document.querySelector('#view-prompt .delete-button').addEventListener('click', (event) => {
                    event.preventDefault();
                    const customEvent = { target: { getAttribute: () => promptToView.id } };
                    handleDelete(customEvent);
                });
                document.getElementById('close-view-button').addEventListener('click', () => {
                    viewPromptElement.remove();
                    hideOverlay();
                });

                showOverlay();
            } else {
                console.error('Prompt not found');
            }
        });
    } else {
        console.error('Event target does not contain data-id attribute.');
    }
}





function addEditAndDeleteListeners() {
    const editButtons = document.querySelectorAll('.edit-button');
    const deleteButtons = document.querySelectorAll('.delete-button');

    editButtons.forEach(button => button.addEventListener('click', handleEdit));
    deleteButtons.forEach(button => button.addEventListener('click', handleDelete));
}

function handleEdit(event) {
    event.stopPropagation(); // Stop the event from propagating to parent elements
    const promptId = event.target.getAttribute('data-id');
    console.log('Editing prompt with ID:', promptId); // Check if the correct prompt ID is retrieved
    chrome.storage.local.get({prompts: []}, data => {
        const promptToEdit = data.prompts.find(prompt => prompt.id === promptId);
        if (promptToEdit) {
            const form = document.getElementById('prompt-form');
            form.setAttribute('data-editing-id', promptId);
            document.getElementById('prompt-name').value = promptToEdit.title;
            document.getElementById('prompt-content').value = promptToEdit.content;

            // Update form title
            const formTitle = document.querySelector('#prompt-form h2');
            formTitle.textContent = 'Edit Prompt'; // Update the form title

            form.classList.add('visible');

            // Update the content in the grid view
            const promptListItem = document.querySelector(`.prompt-list_item[data-id="${promptId}"]`);
            if (promptListItem) {
                const titleElement = promptListItem.querySelector('h3');
                const excerptElement = promptListItem.querySelector('p');
                if (titleElement && excerptElement) {
                    titleElement.textContent = promptToEdit.title;
                    excerptElement.textContent = truncateString(promptToEdit.content, 90);
                }
            }
        }
        showOverlay();

    });
}

function handleDelete(event) {
    if (!confirm("Are you sure you want to delete this prompt?")) return;
    const promptId = event.target.getAttribute('data-id');
    chrome.storage.local.get({ prompts: [] }, data => {
        const updatedPrompts = data.prompts.filter(prompt => prompt.id !== promptId);
        chrome.storage.local.set({ prompts: updatedPrompts }, () => {
            console.log('Prompt deleted successfully!');
            removePromptFromList(promptId); // Remove prompt from UI
            // Update the UI only after the deletion process is completed
            displayUpdatedPrompts(updatedPrompts);
            hideOverlay(); // Hide overlay after successful delete
        });
    });
}

function removePromptFromList(id) {
    const promptElement = document.querySelector(`.prompt-list_item[data-id="${id}"]`);
    if (promptElement) {
        promptElement.remove();
    }
    // Close the detailed view if it's open for the deleted prompt
    const detailedView = document.getElementById('view-prompt');
    if (detailedView && detailedView.querySelector('.delete-button').getAttribute('data-id') === id) {
        detailedView.remove();
    }
}


function handleCopy() {
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.removeEventListener('click', copyHandler); // Remove any existing event listener
        button.addEventListener('click', copyHandler); // Attach the event listener
    });
}

function copyHandler(event) {
    const content = event.currentTarget.getAttribute('data-content');
    navigator.clipboard.writeText(content).then(() => {
        showNotification('Copied');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy. Please try again.');
    });
}


function showPopupMessage(message) {
    const popup = document.createElement('div');
    popup.classList.add('popup-message');
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.remove();
    }, 2000);
}

function setupSearchFunctionality() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = searchInput.value.toLowerCase();
        chrome.storage.local.get({prompts: []}, data => {
            const filteredPrompts = data.prompts.filter(prompt => prompt.title.toLowerCase().includes(searchTerm) || prompt.content.toLowerCase().includes(searchTerm));
            document.getElementById('prompt-list').innerHTML = ''; 
            displayPrompts(filteredPrompts);
            document.getElementById('load-more-prompts').style.display = 'none'; 
        });
    });
}


