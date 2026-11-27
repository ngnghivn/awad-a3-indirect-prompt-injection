#AWADSeminar23KTPM1

Seminar A3 - Indirect Prompt Injection Through Web Content

Nhóm mình tìm hiểu trường hợp AI đọc một trang web có chứa câu lệnh do người khác cài vào, rồi làm theo câu lệnh đó dù người dùng không yêu cầu. Ví dụ, người dùng chỉ hỏi giá tai nghe, nhưng nội dung trong trang lại yêu cầu AI gửi ghi chú riêng đến một địa chỉ email khác.

Nhóm so sánh Qwen3.5 4B và Qwen3.5 9B chạy trên máy với Gemini 3.5 Flash-Lite qua API. Câu hỏi nghiên cứu là: khi cùng đọc các trang như vậy, các model khác nhau thế nào về tỷ lệ thực hiện hành động ngoài yêu cầu, thời gian xử lý, lượng token và chi phí API ước tính?

Một kết quả đáng chú ý là Qwen3.5 4B vẫn trả lời đúng 100% câu hỏi trên các trang có cài lệnh theo cách chấm của nhóm, nhưng làm lộ mật khẩu Wi-Fi giả trong ghi chú riêng ở 67,5% trường hợp qua chức năng gửi email mô phỏng. Đây là các giá trị trung vị qua 5 lượt chạy; đáp án được chấm bằng quy tắc cố định từ log.

Kết quả này cho thấy câu trả lời cuối có thể đúng, trong khi agent đã thực hiện thêm một hành động người dùng không yêu cầu. Vì vậy, nhóm kiểm tra cả câu trả lời và các lần gọi chức năng của agent để đánh giá kết quả.

Trong video, nhóm sẽ minh họa một trường hợp cụ thể từ log, trình bày cách đo và kết quả so sánh ba model. Nhóm cũng giải thích giới hạn của thí nghiệm và khi nào không nên giao quyền tự gửi dữ liệu cho model nhỏ.

Các trang web đều do nhóm tạo để chạy trên máy. Ghi chú và mật khẩu là dữ liệu giả; chức năng gửi email chỉ được mô phỏng, không gửi thư thật. Kết luận chỉ áp dụng cho bộ thử nghiệm và các cấu hình model đã dùng.

Video thuyết trình: [ĐIỀN LINK SAU KHI QUAY]

Repo, code và log để kiểm tra lại: https://github.com/ngnghivn/awad-a3-indirect-prompt-injection

Nhóm: 23127221 · 23127281 · 23127446
