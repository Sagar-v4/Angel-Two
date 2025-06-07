gen:
	@echo "\n-> gRPC code generating..."
	@echo "- Creating protobuf/gen/* folders if not exist"
	@mkdir -p protobuf/gen/auth
	@mkdir -p protobuf/gen/broker
	@echo "- Generating gRPC code..."
	@protoc \
		--proto_path=protobuf \
		--go_out=protobuf/gen/auth \
		--go_opt=paths=source_relative \
  		--go-grpc_out=protobuf/gen/auth \
		--go-grpc_opt=paths=source_relative \
			auth.proto
	@echo "[+] Auth gRPC code created."
	@protoc \
		--proto_path=protobuf \
		--go_out=protobuf/gen/broker \
		--go_opt=paths=source_relative \
  		--go-grpc_out=protobuf/gen/broker \
		--go-grpc_opt=paths=source_relative \
			broker.proto
	@echo "[+] Broker gRPC code created."
	@echo "<- gRPC code generation completed.\n"
