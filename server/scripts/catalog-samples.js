const genres = {
    'van-hoc': 'Văn học',
    'tam-ly-ky-nang-song': 'Tâm lý - Kỹ năng sống',
    'cong-nghe-thong-tin': 'Công nghệ thông tin',
    'kinh-te': 'Kinh tế',
    'sach-giao-khoa': 'Sách giáo khoa',
    'khoa-hoc': 'Khoa học'
}

const authors = {
    an: { name: 'Lâm Thanh An', year: 1988 },
    khue: { name: 'Đỗ Nhật Khuê', year: 1991 },
    minh: { name: 'Vũ An Minh', year: 1985 },
    chi: { name: 'Mai Tường Chi', year: 1990 },
    phuc: { name: 'Trần Hải Phúc', year: 1987 },
    nhu: { name: 'Ngô Lam Như', year: 1993 },
    quan: { name: 'Phạm Gia Quân', year: 1984 },
    ha: { name: 'Lê Phương Hạ', year: 1992 },
    vy: { name: 'Bùi Thiên Vy', year: 1989 }
}

const publishers = {
    giay: 'NXB Đồi Giấy (Mẫu)',
    cuaSo: 'NXB Cửa Sổ Xanh (Mẫu)',
    duongKe: 'NXB Đường Kẻ (Mẫu)'
}

const books = [
    {
        bookId: 'DEMO-001', slug: 'mau-mua-qua-hien-nha', name: 'Mưa Qua Hiên Nhà',
        genre: 'van-hoc', authors: ['an'], publisher: 'giay',
        year: 2023, pages: 208, size: '13 × 20,5 cm', price: 89000, discount: 10,
        description: 'Khi trở về thị trấn ven sông, Linh tìm thấy một tập thư trong ngăn kéo cũ và lần theo những câu chuyện gia đình qua ba mùa mưa.'
    },
    {
        bookId: 'DEMO-002', slug: 'mau-chuyen-tau-ve-doi-sim', name: 'Chuyến Tàu Về Đồi Sim',
        genre: 'van-hoc', authors: ['khue'], publisher: 'giay',
        year: 2024, pages: 256, size: '14 × 20,5 cm', price: 119000, discount: 0,
        description: 'Trên chuyến tàu cuối tuần, một họa sĩ và một người đưa thư cùng tìm đến ngôi làng sắp biến mất khỏi bản đồ.'
    },
    {
        bookId: 'DEMO-003', slug: 'mau-thanh-pho-cua-nhung-la-thu', name: 'Thành Phố Của Những Lá Thư',
        genre: 'van-hoc', authors: ['an', 'khue'], publisher: 'giay',
        year: 2025, pages: 224, size: '13 × 20,5 cm', price: 105000, discount: 15,
        description: 'Mười truyện ngắn nối với nhau qua một hòm thư chung cư, nơi những người xa lạ để lại lời nhắn cho nhau.'
    },
    {
        bookId: 'DEMO-004', slug: 'mau-mot-gio-cho-minh', name: 'Một Giờ Cho Mình',
        genre: 'tam-ly-ky-nang-song', authors: ['minh'], publisher: 'cuaSo',
        year: 2024, pages: 176, size: '13 × 20,5 cm', price: 79000, discount: 5,
        description: 'Những bài thực hành ngắn để sắp xếp thời gian nghỉ, nhận ra việc cần ưu tiên và xây dựng nhịp sinh hoạt phù hợp.'
    },
    {
        bookId: 'DEMO-005', slug: 'mau-nghe-het-cau-chuyen', name: 'Nghe Hết Câu Chuyện',
        genre: 'tam-ly-ky-nang-song', authors: ['chi'], publisher: 'cuaSo',
        year: 2023, pages: 192, size: '14 × 20,5 cm', price: 95000, discount: 0,
        description: 'Các tình huống đối thoại ở nhà và nơi làm việc giúp người đọc luyện đặt câu hỏi mở, lắng nghe và phản hồi rõ ràng.'
    },
    {
        bookId: 'DEMO-006', slug: 'mau-so-tay-thoi-quen-nho', name: 'Sổ Tay Thói Quen Nhỏ',
        genre: 'tam-ly-ky-nang-song', authors: ['minh'], publisher: 'cuaSo',
        year: 2025, pages: 144, size: '13 × 19 cm', price: 68000, discount: 10,
        description: 'Sổ thực hành bốn tuần với mẫu theo dõi, gợi ý điều chỉnh mục tiêu và ví dụ về cách bắt đầu từ những việc nhỏ.'
    },
    {
        bookId: 'DEMO-007', slug: 'mau-xay-trang-web-dau-tien', name: 'Xây Trang Web Đầu Tiên',
        genre: 'cong-nghe-thong-tin', authors: ['phuc'], publisher: 'duongKe',
        year: 2024, pages: 296, size: '16 × 24 cm', price: 159000, discount: 10,
        description: 'Hướng dẫn dựng một website giới thiệu cá nhân bằng HTML, CSS và JavaScript, từ bố cục đến biểu mẫu tương tác.'
    },
    {
        bookId: 'DEMO-008', slug: 'mau-du-lieu-tu-nhung-cau-hoi', name: 'Dữ Liệu Từ Những Câu Hỏi',
        genre: 'cong-nghe-thong-tin', authors: ['nhu'], publisher: 'duongKe',
        year: 2025, pages: 320, size: '16 × 24 cm', price: 189000, discount: 0,
        description: 'Giới thiệu cách làm sạch, truy vấn và vẽ biểu đồ từ dữ liệu giả lập của một thư viện và một cửa hàng nhỏ.'
    },
    {
        bookId: 'DEMO-009', slug: 'mau-lap-trinh-qua-tro-choi-nho', name: 'Lập Trình Qua Trò Chơi Nhỏ',
        genre: 'cong-nghe-thong-tin', authors: ['phuc', 'nhu'], publisher: 'duongKe',
        year: 2026, pages: 280, size: '16 × 24 cm', price: 169000, discount: 15,
        description: 'Từng bước xây trò đoán số, ghép hình và mê cung để làm quen với vòng lặp, mảng và cách kiểm thử.'
    },
    {
        bookId: 'DEMO-010', slug: 'mau-dong-tien-trong-cua-hang-nho', name: 'Dòng Tiền Trong Cửa Hàng Nhỏ',
        genre: 'kinh-te', authors: ['quan'], publisher: 'cuaSo',
        year: 2024, pages: 232, size: '14 × 20,5 cm', price: 129000, discount: 10,
        description: 'Theo dõi một cửa hàng giả lập qua bốn quý để tìm hiểu doanh thu, chi phí cố định, tồn kho và dòng tiền.'
    },
    {
        bookId: 'DEMO-011', slug: 'mau-gia-cua-mot-ly-ca-phe', name: 'Giá Của Một Ly Cà Phê',
        genre: 'kinh-te', authors: ['quan'], publisher: 'cuaSo',
        year: 2023, pages: 168, size: '13 × 20,5 cm', price: 87000, discount: 0,
        description: 'Câu chuyện về hành trình của một hạt cà phê minh họa chi phí vận chuyển, lựa chọn của người mua và cách hình thành giá.'
    },
    {
        bookId: 'DEMO-012', slug: 'mau-ke-hoach-cho-phien-cho-cuoi-tuan', name: 'Kế Hoạch Cho Phiên Chợ Cuối Tuần',
        genre: 'kinh-te', authors: ['chi', 'quan'], publisher: 'cuaSo',
        year: 2025, pages: 184, size: '14 × 20,5 cm', price: 109000, discount: 5,
        description: 'Bài tập lập ngân sách, ước tính điểm hòa vốn và chia việc cho một nhóm tổ chức gian hàng cuối tuần.'
    },
    {
        bookId: 'DEMO-013', slug: 'mau-toan-hoc-qua-o-vuong', name: 'Toán Học Qua Ô Vuông',
        genre: 'sach-giao-khoa', authors: ['ha'], publisher: 'duongKe',
        year: 2024, pages: 152, size: '19 × 26 cm', price: 62000, discount: 0,
        description: 'Tập bài học mẫu về phân số, diện tích và đối xứng, với hình vẽ trên lưới ô vuông và đáp án cuối sách.'
    },
    {
        bookId: 'DEMO-014', slug: 'mau-thuc-hanh-doc-hieu-6', name: 'Thực Hành Đọc Hiểu 6',
        genre: 'sach-giao-khoa', authors: ['ha', 'khue'], publisher: 'duongKe',
        year: 2025, pages: 136, size: '19 × 26 cm', price: 58000, discount: 5,
        description: 'Các đoạn văn tự viết kèm câu hỏi mẫu về ý chính, trình tự sự kiện và cách dùng chi tiết để giải thích câu trả lời.'
    },
    {
        bookId: 'DEMO-015', slug: 'mau-khoa-hoc-tu-goc-lop', name: 'Khoa Học Từ Góc Lớp',
        genre: 'sach-giao-khoa', authors: ['vy', 'ha'], publisher: 'duongKe',
        year: 2026, pages: 160, size: '19 × 26 cm', price: 74000, discount: 10,
        description: 'Sách bài học mẫu về ánh sáng, âm thanh và trạng thái của nước, kèm phiếu quan sát cho hoạt động trên lớp.'
    },
    {
        bookId: 'DEMO-016', slug: 'mau-bau-troi-sau-chin-gio', name: 'Bầu Trời Sau Chín Giờ',
        genre: 'khoa-hoc', authors: ['vy'], publisher: 'giay',
        year: 2024, pages: 200, size: '15 × 22 cm', price: 139000, discount: 0,
        description: 'Nhật ký quan sát bầu trời ban đêm dành cho người mới, giải thích vì sao vị trí Mặt Trăng và các chòm sao thay đổi.'
    },
    {
        bookId: 'DEMO-017', slug: 'mau-mot-giot-nuoc-di-dau', name: 'Một Giọt Nước Đi Đâu?',
        genre: 'khoa-hoc', authors: ['vy'], publisher: 'giay',
        year: 2025, pages: 112, size: '18 × 23 cm', price: 99000, discount: 10,
        description: 'Theo chân một giọt nước từ mây xuống lưu vực sông và trở lại khí quyển, với sơ đồ vòng tuần hoàn dễ đọc.'
    },
    {
        bookId: 'DEMO-018', slug: 'mau-vuon-cay-ben-cua-so', name: 'Vườn Cây Bên Cửa Sổ',
        genre: 'khoa-hoc', authors: ['vy', 'nhu'], publisher: 'giay',
        year: 2026, pages: 176, size: '15 × 22 cm', price: 115000, discount: 5,
        description: 'Những thí nghiệm nhỏ về nảy mầm, ánh sáng và độ ẩm giúp người đọc ghi chép và so sánh sự phát triển của cây.'
    }
]

module.exports = { genres, authors, publishers, books }
