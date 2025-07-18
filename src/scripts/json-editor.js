let editor = null;
// This object will hold the context of the show being edited
let currentlyEditing = {
  slug: null,
  type: null,
};

function openJsonEditor(dataOrSlug, showType) {
  let showData;

  if (typeof dataOrSlug === "object") {
    showData = dataOrSlug;
  } else {
    showData = window.allShowsData?.find(
      (show) => show.fileSlug === dataOrSlug
    );
  }

  if (!showData) {
    alert("Error: Could not find show data.");
    return;
  }

  currentlyEditing = { slug: showData.fileSlug, type: showType };

  try {
    const container = document.getElementById("json-editor");
    document.getElementById("json-modal").style.display = "block";
    editor = new JSONEditor(container, { mode: "tree" });
    editor.set(showData);
    editor.expandAll();
  } catch (err) {
    alert("An unexpected error occurred with the JSON editor: " + err.message);
  }
}

function closeJsonEditor() {
  document.getElementById("json-modal").style.display = "none";
  if (editor) {
    editor.destroy();
  }
  // Clear the context
  currentlyEditing = { slug: null, type: null };
}

function saveJson() {
  const updatedData = editor.get();

  fetch("http://localhost:3042/api/save-json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Include the slug, data, and type in the request body
    body: JSON.stringify({
      slug: currentlyEditing.slug,
      data: updatedData,
      type: currentlyEditing.type,
    }),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.success) {
        alert("JSON saved successfully.");
        closeJsonEditor();
      } else {
        alert("Failed to save: " + (result.error || "Unknown error"));
      }
    })
    .catch((err) => {
      alert("Error saving JSON: " + err.message);
    });
}