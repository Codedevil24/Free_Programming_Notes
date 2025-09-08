// client/js/telegramUpload.js
// Reusable functions for preparing Telegram uploads in frontend

// Function to prepare FormData for course uploads (extracted logic)
function prepareCourseFormData(form) {
    const formData = new FormData();
    
    // Basic fields
    formData.append('title', form.querySelector('input[name="title"]')?.value?.trim() || '');
    formData.append('shortDescription', form.querySelector('textarea[name="shortDescription"]')?.value?.trim() || '');
    formData.append('longDescription', form.querySelector('textarea[name="longDescription"]')?.value?.trim() || '');
    formData.append('category', form.querySelector('select[name="category"]')?.value || '');
    formData.append('difficulty', form.querySelector('select[name="difficulty"]')?.value || 'Beginner');
    formData.append('featured', form.querySelector('input[name="featured"]')?.checked || false);
    
    // Thumbnail handling
    const thumbnailType = form.querySelector('input[name="thumbnailType"]:checked')?.value || 'file';
    formData.append('thumbnailType', thumbnailType);
    if (thumbnailType === 'url') {
      formData.append('thumbnailUrl', form.querySelector('input[name="thumbnailUrl"]')?.value?.trim() || '');
    }
    
    // Append files (thumbnail, video, resources)
    const files = [
      { name: 'thumbnailFile', input: form.querySelector('input[name="thumbnailFile"]') },
      { name: 'videoFile', input: form.querySelector('input[name="videoFile"]') },
      { name: 'resourcesFile', input: form.querySelector('input[name="resourcesFile"]') }
    ];
    files.forEach(file => {
      if (file.input?.files?.[0]) formData.append(file.name, file.input.files[0]);
    });
    
    // Build and append chapters JSON (with file preparations)
    const chapters = buildChaptersData(); // Assuming buildChaptersData is available from admin.js
    formData.append('chapters', JSON.stringify(chapters));
    
    return formData;
  }
  
  // Function to handle upload progress (reusable)
  function handleUploadProgress(xhr, progressBar, progressText) {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = `${percentComplete}%`;
        progressText.textContent = `${percentComplete}%`;
      }
    };
  }
  
  // Export for use in other files
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { prepareCourseFormData, handleUploadProgress };
  } else {
    window.telegramUpload = { prepareCourseFormData, handleUploadProgress };
  }