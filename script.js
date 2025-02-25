// API�Ăяo�������̂ݔ���
async function fetchData() {
    try {
        // ���[�f�B���O�\���A�G���[�ƃe�[�u�����\��
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        rankingsTable.style.display = 'none';
        
        // PHP��API����f�[�^���擾
        const response = await fetch('api.php');
        
        // ���X�|���X�̃X�e�[�^�X���`�F�b�N
        if (!response.ok) {
            throw new Error(`API�G���[: ${response.status}`);
        }
        
        // JSON�f�[�^�����
        const data = await response.json();
        
        // �e�[�u�����X�V
        updateTable(data);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showError(error.message);
    }
}