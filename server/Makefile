gen:
	@echo "\n-> gRPC code generating..."
	@echo "- Creating protobuf/gen/* folders if not exist"
	@mkdir -p protobuf/gen/auth # Ensure the output directory exists
	@echo "- Generating gRPC code..."
	@protoc \
		--proto_path=protobuf \
		--go_out=protobuf/gen/auth \
		--go_opt=paths=source_relative \
  		--go-grpc_out=protobuf/gen/auth \
		--go-grpc_opt=paths=source_relative \
			auth.proto
	@echo "<- gRPC code generation complete."