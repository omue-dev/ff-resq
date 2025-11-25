import { Controller } from "@hotwired/stimulus"

/**
 * Handles photo upload preview and file management
 * - Displays file name and size when photo is selected
 * - Shows preview UI with file information
 * - Allows clearing selected photo
 */
export default class extends Controller {
  static targets = ["input", "preview", "fileName", "fileSize"]

  /**
   * Handles file selection and displays preview information
   */
  handleFileSelect(event) {
    const file = event.target.files[0]

    if (file) {
      this.showPreview(file)
    } else {
      this.hidePreview()
    }
  }

  /**
   * Displays the preview UI with file information
   *
   * @param {File} file - The selected file
   */
  showPreview(file) {
    if (!this.hasPreviewTarget) return

    // Update file name
    if (this.hasFileNameTarget) {
      this.fileNameTarget.textContent = file.name
    }

    // Update file size (convert to KB)
    if (this.hasFileSizeTarget) {
      const sizeInKB = (file.size / 1024).toFixed(1)
      this.fileSizeTarget.textContent = `${sizeInKB} KB`
    }

    // Show preview container
    this.previewTarget.classList.add('active')
  }

  /**
   * Hides the preview UI
   */
  hidePreview() {
    if (!this.hasPreviewTarget) return
    this.previewTarget.classList.remove('active')
  }

  /**
   * Clears the selected file and hides preview
   */
  clearFile() {
    if (this.hasInputTarget) {
      this.inputTarget.value = ''
    }
    this.hidePreview()
  }
}
